import { Injectable, NotFoundException } from '@nestjs/common';
import { SetupConfigurationInstallationStatus, SetupConfigurationLayer } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

/** Setup configuration key under which a jurisdiction records its default currency. */
export const JURISDICTION_DEFAULT_CURRENCY_KEY = 'defaultCurrency';

@Injectable()
export class RevenueScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async requireCitizenTaxpayerAccount(identityId: string) {
    const account = await this.prisma.taxpayerAccount.findFirst({
      where: { primaryIdentityId: identityId, isActive: true },
      include: {
        identifiers: true,
        registrations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!account) {
      throw new NotFoundException('No taxpayer account is linked to this citizen identity');
    }

    return account;
  }

  /**
   * Default currency from the jurisdiction's installed setup configuration, or null when the
   * jurisdiction has not configured one. Never falls back to a hard-coded currency.
   */
  async resolveJurisdictionDefaultCurrency(jurisdictionId: string): Promise<string | null> {
    const override = await this.prisma.setupConfigurationOverride.findFirst({
      where: {
        configurationKey: JURISDICTION_DEFAULT_CURRENCY_KEY,
        installation: {
          layer: SetupConfigurationLayer.JURISDICTION,
          jurisdictionId,
          status: SetupConfigurationInstallationStatus.INSTALLED,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const value = override?.overrideValue;
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = (value as Record<string, unknown>).value;
      return typeof nested === 'string' ? nested : null;
    }
    return null;
  }

  async findOrganizationTaxpayerAccount(organizationId: string) {
    return this.prisma.taxpayerAccount.findFirst({
      where: { organizationId, isActive: true },
      include: {
        identifiers: true,
        registrations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async listCitizenAccountIds(identityId: string): Promise<string[]> {
    const accounts = await this.prisma.taxpayerAccount.findMany({
      where: { primaryIdentityId: identityId, isActive: true },
      select: { id: true },
    });
    return accounts.map((account) => account.id);
  }
}
