import { Injectable } from '@nestjs/common';
import { CorporatePublicVerificationMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CORPORATE_REGISTRY_DEFAULT_CONFIGURATION_KEY } from '../corporate-registry.constants';

@Injectable()
export class CorporateRegistryConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultConfiguration() {
    const existing = await this.prisma.corporateRegistryConfiguration.findUnique({
      where: { configurationKey: CORPORATE_REGISTRY_DEFAULT_CONFIGURATION_KEY },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.corporateRegistryConfiguration.create({
      data: {
        configurationKey: CORPORATE_REGISTRY_DEFAULT_CONFIGURATION_KEY,
        publicVerificationMode: CorporatePublicVerificationMode.DISABLED,
        exposeRegisteredOfficePublicly: false,
      },
    });
  }

  async setPublicVerificationMode(mode: CorporatePublicVerificationMode) {
    const config = await this.getDefaultConfiguration();
    return this.prisma.corporateRegistryConfiguration.update({
      where: { id: config.id },
      data: { publicVerificationMode: mode },
    });
  }
}
