import { Injectable } from '@nestjs/common';
import { PropertyPublicVerificationMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PROPERTY_REGISTRY_RULE_ENVIRONMENT } from '../property-registry.constants';

const DEFAULT_CONFIGURATION_KEY = 'default-property-registry';

@Injectable()
export class PropertyRegistryConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureForJurisdiction(jurisdictionId: string) {
    const existing = await this.prisma.propertyRegistryConfiguration.findUnique({
      where: { jurisdictionId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.propertyRegistryConfiguration.create({
      data: {
        jurisdictionId,
        configurationKey: `${DEFAULT_CONFIGURATION_KEY}-${jurisdictionId}`,
        ruleEnvironment: PROPERTY_REGISTRY_RULE_ENVIRONMENT,
        publicVerificationMode: PropertyPublicVerificationMode.DISABLED,
        parcelIdentifierScheme: {
          schemeCode: 'TEMPLATE-PARCEL-ID',
          format: 'NON_PRODUCTION placeholder parcel identifier pattern',
        },
        jurisdictionBoundRules: {
          evidenceRequirements: 'NON_PRODUCTION jurisdiction-bound evidence placeholders',
          surveyorRequirements: 'NON_PRODUCTION licensed surveyor placeholder',
          titleVerification: 'NON_PRODUCTION title verification workflow',
          externalRegistryDependencies: [],
          taxTransferDependencies: 'NON_PRODUCTION revenue integration hook',
        },
      },
    });
  }

  async getDefaultConfiguration() {
    const configuration = await this.prisma.propertyRegistryConfiguration.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (configuration) {
      return configuration;
    }

    const jurisdiction = await this.prisma.jurisdiction.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!jurisdiction) {
      throw new Error('No jurisdiction available for property registry configuration bootstrap');
    }

    return this.ensureForJurisdiction(jurisdiction.id);
  }
}
