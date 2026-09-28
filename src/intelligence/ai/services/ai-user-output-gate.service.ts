import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AiCallStatus,
  AiCallUserDeliveryStatus,
  AiHumanReviewOutcome,
  AiPolicyDecisionOutcome,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { AI_POLICY_REASON_CODES } from '../governed-ai.constants';

@Injectable()
export class AiUserOutputGateService {
  constructor(private readonly prisma: PrismaService) {}

  async assertDeliverableToUser(callRecordId: string): Promise<void> {
    const call = await this.prisma.aiCallRecord.findUnique({
      where: { id: callRecordId },
      include: {
        agentDefinition: true,
        outputRecord: true,
        reviewRecord: true,
      },
    });

    if (!call) {
      throw new ForbiddenException(AI_POLICY_REASON_CODES.GOVERNANCE_CHAIN_INCOMPLETE);
    }

    if (call.policyOutcome !== AiPolicyDecisionOutcome.ALLOW) {
      throw new ForbiddenException(AI_POLICY_REASON_CODES.GOVERNANCE_CHAIN_INCOMPLETE);
    }

    if (call.status !== AiCallStatus.COMPLETED) {
      throw new ForbiddenException(AI_POLICY_REASON_CODES.GOVERNANCE_CHAIN_INCOMPLETE);
    }

    if (!call.governmentAuditLedgerEntryId) {
      throw new ForbiddenException(AI_POLICY_REASON_CODES.AUDIT_RECORD_REQUIRED);
    }

    if (!call.outputRecord) {
      throw new ForbiddenException(AI_POLICY_REASON_CODES.GOVERNANCE_CHAIN_INCOMPLETE);
    }

    if (call.agentDefinition.humanOversightRequired) {
      const review = call.reviewRecord;
      const acceptable =
        review &&
        (review.reviewOutcome === AiHumanReviewOutcome.ACCEPTED ||
          review.reviewOutcome === AiHumanReviewOutcome.ACCEPTED_WITH_MODIFICATION ||
          review.reviewOutcome === AiHumanReviewOutcome.NO_ACTION_REQUIRED);
      if (!acceptable) {
        throw new ForbiddenException(AI_POLICY_REASON_CODES.HUMAN_REVIEW_REQUIRED);
      }
    }
  }

  async markDelivered(callRecordId: string): Promise<void> {
    await this.assertDeliverableToUser(callRecordId);
    await this.prisma.aiCallRecord.update({
      where: { id: callRecordId },
      data: { userDeliveryStatus: AiCallUserDeliveryStatus.DELIVERED },
    });
  }
}
