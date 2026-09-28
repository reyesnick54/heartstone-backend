import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TestEmailAdapter } from '../../../operational-support/communications/adapters/test-email.adapter';
import { TestSmsAdapter } from '../../../operational-support/communications/adapters/test-sms.adapter';
import { TestPaymentProviderAdapter } from '../../../operational-support/financial/adapters/test-payment-provider.adapter';
import {
  PAYMENT_PROVIDER_PORT,
  PaymentProviderPort,
} from '../../../operational-support/financial/ports/payment-provider.port';
import {
  isOperationalProviderConfigured,
  type OperationalProvidersConfig,
} from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDERS_CONFIG_KEY } from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDER_READINESS_CODES } from '../s19.constants';
import { HttpEmailProviderAdapter, HttpSmsProviderAdapter } from './http-notification-provider.adapter';

export interface OperationalProvidersGateResult {
  allowed: boolean;
  reasons: string[];
  paymentReadiness: 'READY' | 'BLOCKED' | 'TEST_ONLY';
  emailReadiness: 'READY' | 'BLOCKED' | 'TEST_ONLY';
  smsReadiness: 'READY' | 'BLOCKED' | 'TEST_ONLY';
}

@Injectable()
export class OperationalProvidersProductionGateService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER_PORT) private readonly paymentProvider: PaymentProviderPort,
    private readonly testPaymentProvider: TestPaymentProviderAdapter,
    private readonly testEmailAdapter: TestEmailAdapter,
    private readonly testSmsAdapter: TestSmsAdapter,
    private readonly httpEmailAdapter: HttpEmailProviderAdapter,
    private readonly httpSmsAdapter: HttpSmsProviderAdapter,
  ) {}

  onModuleInit(): void {
    const nodeEnv = this.configService.get<{ nodeEnv: string }>('app')?.nodeEnv ?? 'development';
    if (nodeEnv !== 'production') {
      return;
    }

    const evaluation = this.evaluateProhibitedAdapters();
    if (!evaluation.allowed) {
      throw new Error(`Production operational providers gate failed: ${evaluation.reasons.join('; ')}`);
    }
  }

  private resolveEmailAdapter() {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    return config.emailProvider === 'configured' ? this.httpEmailAdapter : this.testEmailAdapter;
  }

  private resolveSmsAdapter() {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    return config.smsProvider === 'configured' ? this.httpSmsAdapter : this.testSmsAdapter;
  }

  evaluateProhibitedAdapters(): OperationalProvidersGateResult {
    const reasons: string[] = [];

    if (
      !this.paymentProvider.isProductionAdapter ||
      this.paymentProvider.providerCode === this.testPaymentProvider.providerCode
    ) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.PROHIBITED_PAYMENT_ADAPTER);
    }

    const emailAdapter = this.resolveEmailAdapter();
    if (!emailAdapter.isProductionAdapter) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.PROHIBITED_EMAIL_ADAPTER);
    }

    const smsAdapter = this.resolveSmsAdapter();
    if (!smsAdapter.isProductionAdapter) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.PROHIBITED_SMS_ADAPTER);
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      paymentReadiness: this.paymentProvider.operationalReadinessState,
      emailReadiness: emailAdapter.operationalReadinessState,
      smsReadiness: smsAdapter.operationalReadinessState,
    };
  }

  evaluateOperationalReadiness(): OperationalProvidersGateResult {
    const prohibited = this.evaluateProhibitedAdapters();
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    const reasons = [...prohibited.reasons];

    if (config.paymentProvider === 'configured' && !isOperationalProviderConfigured(config, 'payment')) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.PAYMENT_PROVIDER_NOT_CONFIGURED);
    }
    if (config.emailProvider === 'configured' && !isOperationalProviderConfigured(config, 'email')) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.EMAIL_PROVIDER_NOT_CONFIGURED);
    }
    if (config.smsProvider === 'configured' && !isOperationalProviderConfigured(config, 'sms')) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.SMS_PROVIDER_NOT_CONFIGURED);
    }

    if (!config.operationalReadinessDeclarationReference) {
      reasons.push(OPERATIONAL_PROVIDER_READINESS_CODES.OPERATIONAL_READINESS_BLOCKED);
    }

    return {
      allowed: prohibited.allowed && reasons.length === prohibited.reasons.length,
      reasons,
      paymentReadiness: prohibited.paymentReadiness,
      emailReadiness: prohibited.emailReadiness,
      smsReadiness: prohibited.smsReadiness,
    };
  }
}
