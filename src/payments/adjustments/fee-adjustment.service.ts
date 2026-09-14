import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FeeAdjustmentRequestStatus,
  FeeAdjustmentType,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

export interface CreateFeeAdjustmentRequestInput {
  adjustmentType: FeeAdjustmentType;
  basis: string;
  requestedAmountCents: number;
  currency?: string;
  source: string;
  supportingEvidenceReference?: string;
  requesterIdentityId: string;
  requesterOfficeholderId?: string;
  invoiceId: string;
  assessmentReference?: string;
  requesterRoles?: string[];
}

export interface DecideFeeAdjustmentInput {
  requestId: string;
  deciderIdentityId: string;
  deciderIdentityType: IdentityType;
  deciderOfficeholderId?: string;
  deciderRoles?: string[];
  authorityEvaluationRecordId?: string;
  approvedAmountCents: number;
  reason: string;
  effectiveDate: Date;
}

@Injectable()
export class FeeAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async createRequest(input: CreateFeeAdjustmentRequestInput) {
    this.boundary.rejectForbiddenClientFields(input as unknown as Record<string, unknown>);
    this.boundary.assertTechnicalAdminCannotWaive(input.requesterRoles, input.adjustmentType);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { feeScheduleVersion: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${input.invoiceId} not found`);
    }

    if (invoice.feeScheduleVersion) {
      this.boundary.assertAdjustmentRoutePermitted(
        input.adjustmentType,
        invoice.feeScheduleVersion.permittedAdjustmentRoutes,
      );
    }

    const requestNumber = `FAR-${String(Date.now())}`;

    return this.prisma.feeAdjustmentRequest.create({
      data: {
        requestNumber,
        adjustmentType: input.adjustmentType,
        basis: input.basis,
        requestedAmountCents: input.requestedAmountCents,
        currency: input.currency ?? 'XCD',
        source: input.source,
        supportingEvidenceReference: input.supportingEvidenceReference,
        requesterIdentityId: input.requesterIdentityId,
        requesterOfficeholderId: input.requesterOfficeholderId,
        invoiceId: input.invoiceId,
        assessmentReference: input.assessmentReference,
      },
    });
  }

  async decide(input: DecideFeeAdjustmentInput) {
    this.boundary.assertAiCannotApproveFinancialAction('APPROVE_WAIVER', input.deciderIdentityType);
    this.boundary.assertTechnicalAdminCannotWaive(
      input.deciderRoles,
      FeeAdjustmentType.WAIVER,
    );
    this.boundary.assertAdjustmentCannotChangeGovernmentDecision(false);

    const request = await this.prisma.feeAdjustmentRequest.findUnique({
      where: { id: input.requestId },
      include: { invoice: { include: { feeScheduleVersion: true } }, decision: true },
    });

    if (!request) {
      throw new NotFoundException(`FeeAdjustmentRequest ${input.requestId} not found`);
    }

    if (request.decision) {
      throw new NotFoundException('Decision already recorded for this request');
    }

    if (request.invoice.feeScheduleVersion) {
      this.boundary.assertAdjustmentRoutePermitted(
        request.adjustmentType,
        request.invoice.feeScheduleVersion.permittedAdjustmentRoutes,
      );
    }

    this.boundary.assertSegregationEnforced(
      true,
      request.requesterIdentityId,
      input.deciderIdentityId,
    );

    const decision = await this.prisma.feeAdjustmentDecision.create({
      data: {
        requestId: request.id,
        deciderIdentityId: input.deciderIdentityId,
        deciderOfficeholderId: input.deciderOfficeholderId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        approvedAmountCents: input.approvedAmountCents,
        reason: input.reason,
        effectiveDate: input.effectiveDate,
      },
    });

    await this.prisma.feeAdjustmentRequest.update({
      where: { id: request.id },
      data: { status: FeeAdjustmentRequestStatus.APPROVED },
    });

    return decision;
  }
}
