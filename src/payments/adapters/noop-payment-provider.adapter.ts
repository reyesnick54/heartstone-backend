import { Injectable } from '@nestjs/common';

import {
  PaymentProviderPort,
  PaymentProviderRefundInput,
  PaymentProviderRefundResult,
} from '../ports/payment-provider.port';

@Injectable()
export class NoopPaymentProviderAdapter implements PaymentProviderPort {
  readonly providerName = 'noop';
  readonly supportsRefunds = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface requires input shape
  async refund(_input: PaymentProviderRefundInput): Promise<PaymentProviderRefundResult> {
    await Promise.resolve();
    return {
      success: false,
      errorMessage: 'No payment provider integration configured',
    };
  }
}
