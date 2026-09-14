import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PaymentIntentStatus } from '@prisma/client';

import { DeterministicTestPaymentProviderAdapter } from './adapters/deterministic-test-payment-provider.adapter';
import { containsForbiddenPciData } from './common/payment-hash.util';
import { PaymentsBoundaryService } from './common/payments-boundary.service';
import { PHASE_11B_INVARIANTS } from './phase-11b-invariants.constants';

describe('Phase 11B payment invariants', () => {
  let boundary: PaymentsBoundaryService;
  let testProvider: DeterministicTestPaymentProviderAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsBoundaryService, DeterministicTestPaymentProviderAdapter],
    }).compile();

    boundary = module.get(PaymentsBoundaryService);
    testProvider = module.get(DeterministicTestPaymentProviderAdapter);
  });

  it('documents all required invariants', () => {
    expect(PHASE_11B_INVARIANTS).toHaveLength(19);
  });

  it('rejects client redirect marking payment SETTLED', () => {
    expect(() => { boundary.assertRedirectCannotSettle(PaymentIntentStatus.SETTLED); }).toThrow(
      ForbiddenException,
    );
  });

  it('rejects invalid webhook signature', async () => {
    const payload = {
      externalEventId: 'evt-1',
      eventType: 'payment.settled',
      providerIntentReference: 'test-intent',
      amountCents: 1000,
      currency: 'XCD',
    };
    const rawBody = JSON.stringify(payload);
    const result = await testProvider.verifyWebhook({
      signature: 'invalid',
      timestamp: String(Math.floor(Date.now() / 1000)),
      payload,
      rawBody,
    });
    expect(result.valid).toBe(false);
    expect(result.signatureValidationResult).toBe('INVALID');
  });

  it('rejects replayed webhook timestamps', async () => {
    const payload = {
      externalEventId: 'evt-replay',
      eventType: 'payment.settled',
      providerIntentReference: 'test-intent',
      amountCents: 1000,
      currency: 'XCD',
    };
    const rawBody = JSON.stringify(payload);
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = testProvider.computeTestSignature(rawBody, staleTimestamp);
    const result = await testProvider.verifyWebhook({
      signature,
      timestamp: staleTimestamp,
      payload,
      rawBody,
    });
    expect(result.valid).toBe(false);
    expect(result.timestampValidation).toBe('REPLAY_REJECTED');
  });

  it('rejects currency mismatch', () => {
    expect(() => { boundary.assertCurrencyMatch('XCD', 'USD'); }).toThrow(/Currency mismatch/);
  });

  it('rejects payment exceeding invoice balance', () => {
    expect(() => { boundary.assertPaymentDoesNotExceedInvoice({
        invoiceTotalCents: 1000,
        currentPaidCents: 900,
        paymentAmountCents: 200,
      }); },
    ).toThrow(/exceed invoice balance/);
  });

  it('rejects allocation exceeding settled value', () => {
    expect(() => { boundary.assertAllocationWithinSettled({
        settledAmountCents: 1000,
        existingAllocationCents: 900,
        requestedAllocationCents: 200,
      }); },
    ).toThrow(/Allocation exceeds settled/);
  });

  it('blocks payment from approving application', () => {
    expect(() => boundary.assertPaymentDoesNotApproveApplication()).toThrow(/does not approve/);
  });

  it('blocks payment from issuing instrument', () => {
    expect(() => boundary.assertPaymentDoesNotIssueInstrument()).toThrow(/does not issue/);
  });

  it('blocks payment from renewing instrument', () => {
    expect(() => boundary.assertPaymentDoesNotRenewInstrument()).toThrow(/does not renew/);
  });

  it('blocks payment from satisfying compliance automatically', () => {
    expect(() => boundary.assertPaymentDoesNotSatisfyCompliance()).toThrow(/does not automatically satisfy/);
  });

  it('rejects PCI fields in payloads', () => {
    expect(containsForbiddenPciData({ pan: '4111111111111111' })).toBe(true);
    expect(() => { boundary.rejectPciFields({ cvv: '123' }); }).toThrow(/PCI-sensitive/);
  });

  it('strips credentialReference from provider configuration responses', () => {
    const sanitized = boundary.sanitizeProviderConfiguration({
      providerCode: 'TEST',
      credentialReference: 'env:SECRET',
    });
    expect(sanitized).not.toHaveProperty('credentialReference');
  });

  it('requires controlled actor for manual payment confirmation', () => {
    expect(() => { boundary.assertManualPaymentRequiresReviewer(undefined); }).toThrow(/controlled financial/);
  });

  it('blocks AI from executing payment actions', () => {
    expect(() => { boundary.assertAiCannotExecutePayment('CREATE_PAYMENT_INTENT', true); }).toThrow(
      /AI assistance cannot perform payment action/,
    );
    expect(() => { boundary.assertAiCannotExecutePayment('MARK_SETTLED', true); }).toThrow(
      /AI assistance cannot perform payment action/,
    );
  });
});
