import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';

import {
  FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS,
  FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS,
  FORBIDDEN_CLIENT_FINANCIAL_APPROVAL_FIELDS,
  FORBIDDEN_CLIENT_INVOICE_FIELDS,
  FORBIDDEN_CLIENT_PAYMENT_INTENT_FIELDS,
  FORBIDDEN_CLIENT_PAYMENT_TRANSACTION_FIELDS,
  FORBIDDEN_CLIENT_REFUND_FIELDS,
  FORBIDDEN_PAYMENT_CARD_STORAGE_FIELDS,
  FORBIDDEN_PAYMENT_SIDE_EFFECT_FIELDS,
  IMMUTABLE_ISSUED_INVOICE_FIELDS,
  OPERATIONAL_SUPPORT_REASON_CODES,
} from '../operational-support.constants';

@Injectable()
export class OperationalSupportBoundaryService {
  rejectPaymentCardStorageFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_PAYMENT_CARD_STORAGE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${OPERATIONAL_SUPPORT_REASON_CODES.PAN_CVV_STORAGE_FORBIDDEN}: storage of "${field}" is prohibited`,
        );
      }
    }
  }

  assertPaymentDoesNotConstituteApproval(context?: string): void {
    if (context?.toLowerCase().includes('approval granted')) {
      throw new ForbiddenException(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_NOT_APPROVAL);
    }
  }

  assertReceiptDoesNotConstituteDecision(context?: string): void {
    if (context?.toLowerCase().includes('decision recorded')) {
      throw new ForbiddenException(OPERATIONAL_SUPPORT_REASON_CODES.RECEIPT_NOT_DECISION);
    }
  }

  rejectClientSetTotals(payload: Record<string, unknown>, fields: readonly string[]): void {
    for (const field of fields) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN}: client may not set "${field}"`,
        );
      }
    }
  }

  rejectClientFeeScheduleFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set fee schedule field "${field}"`);
      }
    }
  }

  rejectClientFeeAssessmentFields(payload: Record<string, unknown>): void {
    this.rejectClientSetTotals(payload, FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS);
  }

  rejectClientInvoiceFields(payload: Record<string, unknown>): void {
    this.rejectClientSetTotals(payload, FORBIDDEN_CLIENT_INVOICE_FIELDS);
  }

  rejectClientPaymentIntentFields(payload: Record<string, unknown>): void {
    this.rejectClientSetTotals(payload, FORBIDDEN_CLIENT_PAYMENT_INTENT_FIELDS);
  }

  rejectClientPaymentTransactionFields(payload: Record<string, unknown>): void {
    this.rejectClientSetTotals(payload, FORBIDDEN_CLIENT_PAYMENT_TRANSACTION_FIELDS);
  }

  rejectClientRefundFields(payload: Record<string, unknown>): void {
    this.rejectClientSetTotals(payload, FORBIDDEN_CLIENT_REFUND_FIELDS);
  }

  rejectClientFinancialApprovalFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_FINANCIAL_APPROVAL_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set financial approval field "${field}"`);
      }
    }
  }

  assertIssuedInvoiceTotalsImmutable(
    currentStatus: InvoiceStatus,
    payload: Record<string, unknown>,
  ): void {
    if (currentStatus === InvoiceStatus.DRAFT) {
      return;
    }

    for (const field of IMMUTABLE_ISSUED_INVOICE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${OPERATIONAL_SUPPORT_REASON_CODES.ISSUED_INVOICE_IMMUTABLE}: "${field}" cannot change after issue`,
        );
      }
    }
  }

  rejectPaymentSideEffects(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_PAYMENT_SIDE_EFFECT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_DOES_NOT_ALTER_CASE}: payment must not mutate "${field}"`,
        );
      }
    }
  }

  assertPaymentDoesNotAlterCaseStatus(caseStatusMutationRequested: boolean): void {
    if (caseStatusMutationRequested) {
      throw new ForbiddenException(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_DOES_NOT_ALTER_CASE);
    }
  }

  assertPaymentDoesNotAlterGovernmentDecision(decisionMutationRequested: boolean): void {
    if (decisionMutationRequested) {
      throw new ForbiddenException(
        OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_DOES_NOT_ALTER_DECISION,
      );
    }
  }

  assertWebhookAmountMatches(expectedCents: number, actualCents: number): void {
    if (expectedCents !== actualCents) {
      throw new BadRequestException(
        `${OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_AMOUNT_MISMATCH}: expected ${String(expectedCents)}, received ${String(actualCents)}`,
      );
    }
  }

  assertWebhookCurrencyMatches(expectedCurrency: string, actualCurrency: string): void {
    if (expectedCurrency.toUpperCase() !== actualCurrency.toUpperCase()) {
      throw new BadRequestException(
        `${OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_CURRENCY_MISMATCH}: expected ${expectedCurrency}, received ${actualCurrency}`,
      );
    }
  }

  assertRefundWithinSettledAmount(
    settledAmountCents: number,
    priorRefundedCents: number,
    requestedAmountCents: number,
  ): void {
    const maxRefundable = settledAmountCents - priorRefundedCents;
    if (requestedAmountCents > maxRefundable) {
      throw new BadRequestException(
        `${OPERATIONAL_SUPPORT_REASON_CODES.REFUND_EXCEEDS_SETTLED}: maximum refundable is ${String(maxRefundable)}`,
      );
    }
  }

  assertRefundAuthorizerDiffersFromRequester(
    requesterIdentityId: string | null | undefined,
    authorizerIdentityId: string,
  ): void {
    if (requesterIdentityId && requesterIdentityId === authorizerIdentityId) {
      throw new ForbiddenException(
        `${OPERATIONAL_SUPPORT_REASON_CODES.REFUND_SEGREGATION_REQUIRED}: authorizer must differ from requester`,
      );
    }
  }
}
