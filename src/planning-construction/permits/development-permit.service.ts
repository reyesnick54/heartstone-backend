import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DevelopmentAccessActorKind,
  DevelopmentPermitStatus,
  IdentityType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PlanningConstructionAuthorityService } from '../common/planning-construction-authority.service';
import { PlanningConstructionBoundaryService } from '../common/planning-construction-boundary.service';
import { DevelopmentExternalDependencyService } from '../external/development-external-dependency.service';
import { PLANNING_PERMIT_REFERENCE_PREFIX } from '../planning-construction.constants';

export interface IssueDevelopmentPermitInput {
  developmentProjectId: string;
  permitType: string;
  actorKind: DevelopmentAccessActorKind;
  actorIdentityType: IdentityType;
  issuedByOfficeholderId: string;
  issuerIdentityId: string;
  appointmentId?: string;
  clientPayload?: Record<string, unknown>;
  aiAction?: string;
}

export interface AmendDevelopmentPermitInput {
  developmentPermitId: string;
  amendmentSummary: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class DevelopmentPermitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PlanningConstructionBoundaryService,
    private readonly authority: PlanningConstructionAuthorityService,
    private readonly externalDependencies: DevelopmentExternalDependencyService,
  ) {}

  async issuePermit(input: IssueDevelopmentPermitInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientPermitIssuanceFields(input.clientPayload);
    }
    this.boundary.assertApplicantCannotSelfIssuePermit(input.actorKind);
    this.boundary.assertProfessionalCannotSelfApprovePermit(input.actorKind);
    if (input.aiAction) {
      this.boundary.assertAiCannotIssuePermit(input.aiAction);
    }
    if (input.actorIdentityType === IdentityType.SERVICE) {
      this.boundary.assertAiCannotIssuePermit('ISSUE_DEVELOPMENT_PERMIT');
    }

    await this.externalDependencies.assertPermitDecisionAllowed(input.developmentProjectId);
    await this.authority.assertPermitIssuanceAuthority({
      identityId: input.issuerIdentityId,
      officeholderId: input.issuedByOfficeholderId,
      appointmentId: input.appointmentId,
    });

    const count = await this.prisma.developmentPermit.count();
    const permitNumber = `${PLANNING_PERMIT_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const permit = await this.prisma.developmentPermit.create({
      data: {
        developmentProjectId: input.developmentProjectId,
        permitNumber,
        permitType: input.permitType,
        status: DevelopmentPermitStatus.ISSUED,
        issuedByOfficeholderId: input.issuedByOfficeholderId,
        issuedAt: new Date(),
      },
    });

    const version = await this.prisma.developmentPermitVersion.create({
      data: {
        developmentPermitId: permit.id,
        versionNumber: 1,
        isAmendment: false,
        payload: {},
      },
    });

    return this.prisma.developmentPermit.update({
      where: { id: permit.id },
      data: { currentVersionId: version.id },
      include: { versions: true },
    });
  }

  async amendPermit(input: AmendDevelopmentPermitInput) {
    const permit = await this.prisma.developmentPermit.findUnique({
      where: { id: input.developmentPermitId },
      include: { versions: true },
    });
    if (!permit) {
      throw new NotFoundException(`DevelopmentPermit ${input.developmentPermitId} not found`);
    }

    const nextVersion = (permit.versions.at(-1)?.versionNumber ?? 0) + 1;
    const version = await this.prisma.developmentPermitVersion.create({
      data: {
        developmentPermitId: permit.id,
        versionNumber: nextVersion,
        isAmendment: true,
        amendmentSummary: input.amendmentSummary,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });

    await this.prisma.developmentPermit.update({
      where: { id: permit.id },
      data: {
        status: DevelopmentPermitStatus.AMENDED,
        currentVersionId: version.id,
      },
    });

    return version;
  }
}
