import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  NoncomplianceFindingStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface RecordInspectionFindingInput {
  inspectionSessionId: string;
  inspectionObservationId?: string;
  severity: ComplianceFindingSeverity;
  findingCode: string;
  description: string;
  isViolation?: boolean;
  determinedByIdentityId: string;
  determinedByOfficeholderId: string;
  complianceMatterId?: string;
}

export interface CloseInspectionFindingInput {
  inspectionFindingId: string;
  closedByIdentityId: string;
  closedByOfficeholderId: string;
  closureReason: string;
  remediationReference?: string;
  holderIdentityId?: string | null;
}

@Injectable()
export class InspectionFindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async recordFinding(input: RecordInspectionFindingInput) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: input.inspectionSessionId },
    });
    if (!session) {
      throw new NotFoundException(`Inspection session "${input.inspectionSessionId}" was not found`);
    }

    this.boundary.assertObservationIsNotFinding({ autoPromoteObservationToFinding: false });

    const isViolation = input.isViolation ?? false;
    if (isViolation) {
      this.boundary.assertFindingIsNotViolation({ autoTreatFindingAsViolation: false });
    }

    const finding = await this.prisma.inspectionFinding.create({
      data: {
        inspectionSessionId: input.inspectionSessionId,
        inspectionObservationId: input.inspectionObservationId,
        severity: input.severity,
        findingCode: input.findingCode,
        description: input.description,
        isViolation,
        determinedByIdentityId: input.determinedByIdentityId,
        determinedByOfficeholderId: input.determinedByOfficeholderId,
        status: ComplianceFindingStatus.OPEN,
      },
    });

    if (isViolation) {
      const matterId = input.complianceMatterId ?? session.complianceMatterId;
      if (matterId) {
        await this.prisma.noncomplianceFinding.create({
          data: {
            inspectionFindingId: finding.id,
            complianceMatterId: matterId,
            violationCode: input.findingCode,
            description: input.description,
            severity: input.severity,
            status: NoncomplianceFindingStatus.OPEN,
          },
        });
      }
    }

    return finding;
  }

  async closeFinding(input: CloseInspectionFindingInput) {
    this.boundary.assertHolderCannotCloseFinding({
      actorIdentityId: input.closedByIdentityId,
      holderIdentityId: input.holderIdentityId,
    });

    const closure = await this.prisma.complianceFindingClosure.create({
      data: {
        inspectionFindingId: input.inspectionFindingId,
        closedByIdentityId: input.closedByIdentityId,
        closedByOfficeholderId: input.closedByOfficeholderId,
        closureReason: input.closureReason,
        remediationReference: input.remediationReference,
      },
    });

    await this.prisma.inspectionFinding.update({
      where: { id: input.inspectionFindingId },
      data: { status: ComplianceFindingStatus.CLOSED },
    });

    return closure;
  }
}
