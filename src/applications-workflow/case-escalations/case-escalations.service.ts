import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CaseEscalation,
  CaseEscalationRoute,
  CaseEscalationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CASE_COORDINATION_EXPLANATION_CODES } from '../applications-workflow.constants';

export interface CreateCaseEscalationInput {
  caseId: string;
  escalationRoute: CaseEscalationRoute;
  triggeredByIdentityId: string;
  triggeredByOfficeholderId?: string;
  relatedIssueId?: string;
  relatedSlaClockId?: string;
  relatedReferralId?: string;
  reason: string;
}

@Injectable()
export class CaseEscalationsService {
  constructor(private readonly prisma: PrismaService) {}

  async escalate(input: CreateCaseEscalationInput): Promise<CaseEscalation> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    return this.prisma.caseEscalation.create({
      data: {
        caseId: input.caseId,
        escalationRoute: input.escalationRoute,
        triggeredByIdentityId: input.triggeredByIdentityId,
        triggeredByOfficeholderId: input.triggeredByOfficeholderId,
        relatedIssueId: input.relatedIssueId,
        relatedSlaClockId: input.relatedSlaClockId,
        relatedReferralId: input.relatedReferralId,
        reason: input.reason,
        status: CaseEscalationStatus.OPEN,
        preservesAuthorityBoundary: true,
      },
    });
  }

  escalationPreservesAuthorityBoundary(): {
    bypassesAuthority: false;
    explanationCode: string;
  } {
    return {
      bypassesAuthority: false,
      explanationCode: CASE_COORDINATION_EXPLANATION_CODES.ESCALATION_PRESERVES_AUTHORITY,
    };
  }
}
