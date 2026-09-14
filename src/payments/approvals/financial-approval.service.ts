import { Injectable } from '@nestjs/common';
import { FinancialApprovalDecision, IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

export interface RecordFinancialApprovalInput {
  requesterIdentityId: string;
  reviewerIdentityId?: string;
  approverIdentityId: string;
  approverIdentityType: IdentityType;
  approverOfficeholderId?: string;
  authorityEvaluationRecordId?: string;
  amountCents: number;
  currency?: string;
  purpose: string;
  decision: FinancialApprovalDecision;
  relatedRefundRequestId?: string;
  relatedFeeAdjustmentRequestId?: string;
  segregationRequired?: boolean;
}

@Injectable()
export class FinancialApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async recordApproval(input: RecordFinancialApprovalInput) {
    this.boundary.assertAiCannotApproveFinancialAction(
      input.purpose.includes('REFUND') ? 'APPROVE_REFUND' : 'APPROVE_WAIVER',
      input.approverIdentityType,
    );

    this.boundary.assertSegregationEnforced(
      input.segregationRequired ?? true,
      input.requesterIdentityId,
      input.approverIdentityId,
    );

    const approvalNumber = `FAP-${String(Date.now())}`;

    return this.prisma.financialApprovalRecord.create({
      data: {
        approvalNumber,
        requesterIdentityId: input.requesterIdentityId,
        reviewerIdentityId: input.reviewerIdentityId,
        approverIdentityId: input.approverIdentityId,
        approverOfficeholderId: input.approverOfficeholderId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        amountCents: input.amountCents,
        currency: input.currency ?? 'XCD',
        purpose: input.purpose,
        decision: input.decision,
        relatedRefundRequestId: input.relatedRefundRequestId,
        relatedFeeAdjustmentRequestId: input.relatedFeeAdjustmentRequestId,
      },
    });
  }
}
