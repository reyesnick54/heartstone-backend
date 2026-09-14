import { Injectable, NotFoundException } from '@nestjs/common';

import { DETERMINISTIC_TEST_PROVIDER_CODE } from '../payments.constants';
import { type PaymentProviderPort } from '../ports/payment-provider.port';
import { DeterministicTestPaymentProviderAdapter } from './deterministic-test-payment-provider.adapter';

@Injectable()
export class PaymentProviderRegistryService {
  private readonly providers = new Map<string, PaymentProviderPort>();

  constructor(private readonly testAdapter: DeterministicTestPaymentProviderAdapter) {
    this.register(testAdapter);
  }

  register(provider: PaymentProviderPort): void {
    this.providers.set(provider.providerCode, provider);
  }

  resolve(providerCode: string): PaymentProviderPort {
    const provider = this.providers.get(providerCode);
    if (!provider) {
      throw new NotFoundException(`Payment provider ${providerCode} is not registered`);
    }
    return provider;
  }

  listRegisteredCodes(): string[] {
    return [...this.providers.keys()];
  }

  getTestProvider(): DeterministicTestPaymentProviderAdapter {
    return this.testAdapter;
  }

  getDefaultTestProviderCode(): string {
    return DETERMINISTIC_TEST_PROVIDER_CODE;
  }
}
