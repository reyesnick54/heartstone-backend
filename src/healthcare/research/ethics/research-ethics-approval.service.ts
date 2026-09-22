import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalResearchActorPersona, ResearchEthicsApprovalStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CLINICAL_RESEARCH_REASON_CODES } from '../clinical-research.constants';
import { ClinicalResearchBoundaryService } from '../common/clinical-research-boundary.service';

@Injectable()
export class ResearchEthicsApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ClinicalResearchBoundaryService,
  ) {}

  async recordEthicsApprovalVersion(input: {
    researchEthicsApprovalId: string;
    actorPersona: ClinicalResearchActorPersona;
    action: string;
    committeeInstitutionId?: string;
    recordedByOfficeholderId?: string;
    approvedAt?: Date;
    expiresAt?: Date;
    documentReference?: string;
    nextStatus?: ResearchEthicsApprovalStatus;
  }) {
    this.boundary.assertSponsorCannotSelfApproveEthics(input.actorPersona, input.action);

    if (input.actorPersona === ClinicalResearchActorPersona.TRIAL_SPONSOR) {
      throw new BadRequestException({
        message: 'Trial sponsors cannot record ethics committee approval status',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.SPONSOR_SELF_ETHICS_DENIED,
      });
    }

    const approval = await this.prisma.researchEthicsApproval.findUnique({
      where: { id: input.researchEthicsApprovalId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!approval) {
      throw new NotFoundException('Research ethics approval record not found');
    }

    const nextVersionNumber = (approval.versions[0]?.versionNumber ?? 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      const version = await tx.researchEthicsApprovalVersion.create({
        data: {
          researchEthicsApprovalId: input.researchEthicsApprovalId,
          versionNumber: nextVersionNumber,
          committeeInstitutionId: input.committeeInstitutionId,
          recordedByOfficeholderId: input.recordedByOfficeholderId,
          recordedByPersona: input.actorPersona,
          approvedAt: input.approvedAt,
          expiresAt: input.expiresAt,
          documentReference: input.documentReference,
        },
      });

      const updated = await tx.researchEthicsApproval.update({
        where: { id: input.researchEthicsApprovalId },
        data: {
          currentVersionId: version.id,
          ...(input.nextStatus ? { status: input.nextStatus } : {}),
        },
      });

      return { approval: updated, version };
    });
  }

  isEthicsActiveForEnrollment(
    status: ResearchEthicsApprovalStatus,
    expiresAt?: Date | null,
  ): boolean {
    if (status === ResearchEthicsApprovalStatus.SUSPENDED) {
      return false;
    }
    if (status === ResearchEthicsApprovalStatus.EXPIRED) {
      return false;
    }
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return false;
    }
    return (
      status === ResearchEthicsApprovalStatus.APPROVED ||
      status === ResearchEthicsApprovalStatus.CONDITIONALLY_APPROVED
    );
  }
}
