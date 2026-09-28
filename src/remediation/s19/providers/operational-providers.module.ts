import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TestEmailAdapter } from '../../../operational-support/communications/adapters/test-email.adapter';
import { TestSmsAdapter } from '../../../operational-support/communications/adapters/test-sms.adapter';
import { TestPaymentProviderAdapter } from '../../../operational-support/financial/adapters/test-payment-provider.adapter';
import { PAYMENT_PROVIDER_PORT } from '../../../operational-support/financial/ports/payment-provider.port';
import operationalProvidersConfig, {
  type OperationalProvidersConfig,
} from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDERS_CONFIG_KEY } from '../config/operational-providers.config';
import { ConfiguredPaymentProviderAdapter } from './configured-payment-provider.adapter';
import {
  HttpEmailProviderAdapter,
  HttpSmsProviderAdapter,
} from './http-notification-provider.adapter';
import { OperationalProvidersProductionGateService } from './operational-providers-production-gate.service';

export const OPERATIONAL_EMAIL_CHANNEL = Symbol('OPERATIONAL_EMAIL_CHANNEL');
export const OPERATIONAL_SMS_CHANNEL = Symbol('OPERATIONAL_SMS_CHANNEL');

@Global()
@Module({
  imports: [ConfigModule.forFeature(operationalProvidersConfig)],
  providers: [
    TestPaymentProviderAdapter,
    ConfiguredPaymentProviderAdapter,
    TestEmailAdapter,
    TestSmsAdapter,
    HttpEmailProviderAdapter,
    HttpSmsProviderAdapter,
    OperationalProvidersProductionGateService,
    {
      provide: PAYMENT_PROVIDER_PORT,
      useFactory: (
        configService: ConfigService,
        testProvider: TestPaymentProviderAdapter,
        configuredProvider: ConfiguredPaymentProviderAdapter,
      ) => {
        const config = configService.getOrThrow<OperationalProvidersConfig>(
          OPERATIONAL_PROVIDERS_CONFIG_KEY,
        );
        return config.paymentProvider === 'configured' ? configuredProvider : testProvider;
      },
      inject: [ConfigService, TestPaymentProviderAdapter, ConfiguredPaymentProviderAdapter],
    },
    {
      provide: OPERATIONAL_EMAIL_CHANNEL,
      useFactory: (
        configService: ConfigService,
        testEmail: TestEmailAdapter,
        httpEmail: HttpEmailProviderAdapter,
      ) => {
        const config = configService.getOrThrow<OperationalProvidersConfig>(
          OPERATIONAL_PROVIDERS_CONFIG_KEY,
        );
        return config.emailProvider === 'configured' ? httpEmail : testEmail;
      },
      inject: [ConfigService, TestEmailAdapter, HttpEmailProviderAdapter],
    },
    {
      provide: OPERATIONAL_SMS_CHANNEL,
      useFactory: (
        configService: ConfigService,
        testSms: TestSmsAdapter,
        httpSms: HttpSmsProviderAdapter,
      ) => {
        const config = configService.getOrThrow<OperationalProvidersConfig>(
          OPERATIONAL_PROVIDERS_CONFIG_KEY,
        );
        return config.smsProvider === 'configured' ? httpSms : testSms;
      },
      inject: [ConfigService, TestSmsAdapter, HttpSmsProviderAdapter],
    },
  ],
  exports: [
    PAYMENT_PROVIDER_PORT,
    OPERATIONAL_EMAIL_CHANNEL,
    OPERATIONAL_SMS_CHANNEL,
    OperationalProvidersProductionGateService,
    TestPaymentProviderAdapter,
    TestEmailAdapter,
    TestSmsAdapter,
    HttpEmailProviderAdapter,
    HttpSmsProviderAdapter,
    ConfiguredPaymentProviderAdapter,
  ],
})
export class OperationalProvidersModule {}
