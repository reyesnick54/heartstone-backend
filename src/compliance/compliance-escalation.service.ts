import { Injectable } from '@nestjs/common';
import { ComplianceEscalationLevel } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface EscalateComplianceInput {
  complianceMatterId?: string;
  noncomplianceFindingId?: string;
  level: ComplianceEscalationLevel;
  escalatedByIdentityId: string;
  escalatedByOfficeholderId: string;
  reason: string;
}

@Injectable()
export class ComplianceEscalationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async escalate(input: EscalateComplianceInput) {
    this.boundary.assertPhase9CannotCreateSuspensionDecision({
      isCreatingSuspensionDecision: false,
    });

    return this.prisma.complianceEscalation.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        noncomplianceFindingId: input.noncomplianceFindingId,
        level: input.level,
        escalatedByIdentityId: input.escalatedByIdentityId,
        escalatedByOfficeholderId: input.escalatedByOfficeholderId,
        reason: input.reason,
      },
    });
  }
}
