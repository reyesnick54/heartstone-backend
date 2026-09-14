import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PaymentChannelCode,
  PaymentChannelDefinitionStatus,
  PaymentProviderConfigurationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

@Injectable()
export class PaymentChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async approveChannel(input: {
    code: PaymentChannelCode;
    name: string;
    description?: string;
    acceptedAt?: Date;
    effectiveFrom?: Date;
  }) {
    return this.prisma.paymentChannelDefinition.upsert({
      where: { code: input.code },
      create: {
        code: input.code,
        name: input.name,
        description: input.description,
        status: PaymentChannelDefinitionStatus.APPROVED,
        acceptedAt: input.acceptedAt ?? new Date(),
        effectiveFrom: input.effectiveFrom ?? new Date(),
      },
      update: {
        name: input.name,
        description: input.description,
        status: PaymentChannelDefinitionStatus.APPROVED,
        acceptedAt: input.acceptedAt ?? new Date(),
        effectiveFrom: input.effectiveFrom ?? new Date(),
      },
    });
  }

  listApproved() {
    return this.prisma.paymentChannelDefinition.findMany({
      where: { status: PaymentChannelDefinitionStatus.APPROVED },
      orderBy: { code: 'asc' },
    });
  }
}

@Injectable()
export class PaymentProviderConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async register(input: {
    providerCode: string;
    name: string;
    environment: string;
    merchantAccountReference?: string;
    supportedCurrencies: string[];
    supportedChannels: PaymentChannelCode[];
    webhookConfigured?: boolean;
    credentialReference?: string;
    activate?: boolean;
  }) {
    const record = await this.prisma.paymentProviderConfiguration.upsert({
      where: {
        providerCode_environment: {
          providerCode: input.providerCode,
          environment: input.environment,
        },
      },
      create: {
        providerCode: input.providerCode,
        name: input.name,
        environment: input.environment,
        merchantAccountReference: input.merchantAccountReference,
        supportedCurrencies: input.supportedCurrencies,
        supportedChannels: input.supportedChannels,
        webhookConfigured: input.webhookConfigured ?? false,
        credentialReference: input.credentialReference,
        status: input.activate
          ? PaymentProviderConfigurationStatus.ACTIVE
          : PaymentProviderConfigurationStatus.DRAFT,
        acceptedAt: input.activate ? new Date() : undefined,
        effectiveFrom: input.activate ? new Date() : undefined,
      },
      update: {
        name: input.name,
        merchantAccountReference: input.merchantAccountReference,
        supportedCurrencies: input.supportedCurrencies,
        supportedChannels: input.supportedChannels,
        webhookConfigured: input.webhookConfigured ?? false,
        credentialReference: input.credentialReference,
        status: input.activate
          ? PaymentProviderConfigurationStatus.ACTIVE
          : PaymentProviderConfigurationStatus.DRAFT,
      },
    });

    return this.boundary.sanitizeProviderConfiguration(record);
  }

  async findActive(providerCode: string, environment: string) {
    const config = await this.prisma.paymentProviderConfiguration.findUnique({
      where: { providerCode_environment: { providerCode, environment } },
    });
    if (config?.status !== PaymentProviderConfigurationStatus.ACTIVE) {
      throw new BadRequestException(`Active provider configuration not found for ${providerCode}`);
    }
    return this.boundary.sanitizeProviderConfiguration(config);
  }

  listActive() {
    return this.prisma.paymentProviderConfiguration
      .findMany({ where: { status: PaymentProviderConfigurationStatus.ACTIVE } })
      .then((rows) => rows.map((row) => this.boundary.sanitizeProviderConfiguration(row)));
  }
}
