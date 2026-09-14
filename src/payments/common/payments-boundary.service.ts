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
