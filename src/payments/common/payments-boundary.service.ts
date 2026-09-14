import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { FeeAdjustmentType, IdentityType } from '@prisma/client';

import {
  FORBIDDEN_AI_FINANCIAL_ACTIONS,
  FORBIDDEN_CLIENT_PAYMENT_FIELDS,
  PAYMENTS_REASON_CODES,
  TECHNICAL_ADMIN_ROLE_MARKER,
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PaymentIntentStatus } from '@prisma/client';

import {
  FORBIDDEN_AI_PAYMENT_ACTIONS,
  FORBIDDEN_CLIENT_INVOICE_FIELDS,
  FORBIDDEN_CLIENT_PAYMENT_FIELDS,
  FORBIDDEN_PCI_FIELDS,
} from '../payments.constants';

@Injectable()
export class PaymentsBoundaryService {
  assertAdjustmentRoutePermitted(
    adjustmentType: FeeAdjustmentType,
    permittedRoutes: FeeAdjustmentType[],
  ): void {
    if (!permittedRoutes.includes(adjustmentType)) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.WAIVER_ROUTE_NOT_PERMITTED);
    }
  }

  assertAiCannotApproveFinancialAction(action: string, actorIdentityType: IdentityType): void {
    if (actorIdentityType !== IdentityType.SERVICE) {
      return;
    }

    if (FORBIDDEN_AI_FINANCIAL_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.AI_CANNOT_APPROVE_FINANCIAL_ACTION);
    }
  }

  assertTechnicalAdminCannotWaive(actorRoles: string[] | undefined, adjustmentType: FeeAdjustmentType): void {
    if (
      adjustmentType === FeeAdjustmentType.WAIVER &&
      actorRoles?.includes(TECHNICAL_ADMIN_ROLE_MARKER)
    ) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.TECHNICAL_ADMIN_CANNOT_WAIVE);
    }
  }

  assertRefundWithinRefundableBalance(requestedCents: number, refundableCents: number): void {
    if (requestedCents > refundableCents) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.REFUND_EXCEEDS_REFUNDABLE_BALANCE);
    }
  }

  assertNoDuplicateRefund(existingRefundCount: number): void {
    if (existingRefundCount > 0) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.DUPLICATE_REFUND_BLOCKED);
    }
  }

  assertChargebackNotAuthorizedRefund(isChargeback: boolean): void {
    if (isChargeback) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.CHARGEBACK_NOT_AUTHORIZED_REFUND);
    }
  }

  assertReconciliationMismatchPreserved(matchStatus: string, forceMatch?: boolean): void {
    if (forceMatch && matchStatus !== 'MATCHED') {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.RECONCILIATION_MISMATCH_PRESERVED);
    }
  }

  assertCannotFabricateBankRecord(hasExternalEvidence: boolean): void {
    if (!hasExternalEvidence) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.CANNOT_FABRICATE_BANK_RECORD);
    }
  }

  assertArrearsNotSanction(enforcementAction?: string): void {
    if (enforcementAction) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.ARREARS_NOT_SANCTION);
    }
  }

  assertDisputeDoesNotEraseTransaction(eraseTransaction?: boolean): void {
    if (eraseTransaction) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.DISPUTE_DOES_NOT_ERASE_TRANSACTION);
    }
  }

  assertFinancialCorrectionPreservesOriginal(preservesOriginal: boolean): void {
    if (!preservesOriginal) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.FINANCIAL_CORRECTION_PRESERVES_ORIGINAL);
    }
  }

  assertAdjustmentCannotChangeGovernmentDecision(mutateDecision?: boolean): void {
    if (mutateDecision) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.ADJUSTMENT_CANNOT_CHANGE_GOVERNMENT_DECISION);
    }
  }

  assertSelfApprovalBlocked(requesterId: string, approverId: string): void {
    if (requesterId === approverId) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.SELF_APPROVAL_BLOCKED);
    }
  }

  assertSegregationEnforced(
    segregationRequired: boolean,
    requesterId: string,
    approverId: string,
  ): void {
    if (segregationRequired) {
      this.assertSelfApprovalBlocked(requesterId, approverId);
    }
  }

  assertFailedRefundNotSettled(status: string): void {
    if (status === 'FAILED') {
      throw new BadRequestException(PAYMENTS_REASON_CODES.PROVIDER_REFUND_FAILED_NOT_SETTLED);
    }
  }

  assertSubstantiveDisputeRequiresPhase10Route(
    isSubstantive: boolean,
    substantiveRouteReference?: string,
  ): void {
    if (isSubstantive && !substantiveRouteReference) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.SUBSTANTIVE_DISPUTE_REQUIRES_PHASE_10_ROUTE);
    }
  }

  rejectForbiddenClientFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PAYMENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a payment record`);
      }
    }
  rejectClientPaymentFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PAYMENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set payment field "${field}"`);
      }
    }
  }

  rejectClientInvoiceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_INVOICE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set invoice field "${field}"`);
      }
    }
  }

  assertRedirectCannotSettle(status: PaymentIntentStatus): void {
    if (status === PaymentIntentStatus.SETTLED) {
      throw new ForbiddenException(
        'Client redirect callback cannot mark payment SETTLED; provider webhook or server reconciliation required',
      );
    }
  }

  assertAiCannotExecutePayment(action: string, isAiActor = false): void {
    if (isAiActor && FORBIDDEN_AI_PAYMENT_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(`AI assistance cannot perform payment action: ${action}`);
    }
  }

  assertManualPaymentRequiresReviewer(reviewerOfficeholderId?: string): void {
    if (!reviewerOfficeholderId?.trim()) {
      throw new BadRequestException(
        'Manual payment confirmation requires a controlled financial officeholder reviewer',
      );
    }
  }

  assertManualPaymentCannotImpersonateProviderSettled(isManual: boolean, providerCode: string): void {
    if (isManual && providerCode !== 'MANUAL') {
      throw new BadRequestException(
        'Manual entry cannot impersonate provider-settled payment; use MANUAL provider code',
      );
    }
  }

  assertCurrencyMatch(expected: string, actual: string): void {
    if (expected.toUpperCase() !== actual.toUpperCase()) {
      throw new BadRequestException(`Currency mismatch: expected ${expected}, received ${actual}`);
    }
  }

  assertAllocationWithinSettled(input: {
    settledAmountCents: number;
    existingAllocationCents: number;
    requestedAllocationCents: number;
  }): void {
    if (
      input.existingAllocationCents + input.requestedAllocationCents >
      input.settledAmountCents
    ) {
      throw new BadRequestException('Allocation exceeds settled transaction value');
    }
  }

  assertPaymentDoesNotExceedInvoice(input: {
    invoiceTotalCents: number;
    currentPaidCents: number;
    paymentAmountCents: number;
  }): void {
    if (input.currentPaidCents + input.paymentAmountCents > input.invoiceTotalCents) {
      throw new BadRequestException('Payment would exceed invoice balance');
    }
  }

  rejectPciFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_PCI_FIELDS) {
      if (field in payload) {
        throw new ForbiddenException('PCI-sensitive card data must not be submitted or stored');
      }
    }
  }

  assertPaymentDoesNotApproveApplication(): never {
    throw new ForbiddenException('Payment success does not approve an application');
  }

  assertPaymentDoesNotIssueInstrument(): never {
    throw new ForbiddenException('Payment success does not issue an instrument');
  }

  assertPaymentDoesNotRenewInstrument(): never {
    throw new ForbiddenException('Payment success does not renew an instrument automatically');
  }

  assertPaymentDoesNotSatisfyCompliance(): never {
    throw new ForbiddenException(
      'Payment receipt does not automatically satisfy substantive compliance obligations',
    );
  }

  sanitizeProviderConfiguration<T extends Record<string, unknown>>(
    config: T,
  ): Omit<T, 'credentialReference'> {
    return Object.fromEntries(
      Object.entries(config).filter(([key]) => key !== 'credentialReference'),
    ) as Omit<T, 'credentialReference'>;
  }
}
