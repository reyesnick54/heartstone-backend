import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  ParsedPaymentWebhookPayload,
  PaymentProviderPort,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentWebhookVerificationInput,
} from '../ports/payment-provider.port';

@Injectable()
export class TestPaymentProviderAdapter implements PaymentProviderPort {
  readonly providerCode = 'TEST';

  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean {
    const secret =
      typeof input.configuration.webhookSecret === 'string'
        ? input.configuration.webhookSecret
        : 'test-webhook-secret';

    const expected = createHmac('sha256', secret).update(input.rawBody).digest('hex');
    const provided = input.signature.trim();

    if (expected.length !== provided.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  parseWebhookPayload(rawBody: string): ParsedPaymentWebhookPayload {
    const parsed = JSON.parse(rawBody) as ParsedPaymentWebhookPayload;
    return parsed;
  }

  initiateRefund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    return Promise.resolve({
      providerRefundReference: `test-refund:${input.providerTransactionReference}:${String(input.amountCents)}`,
    });
  }
}
