import { ForbiddenException, Injectable } from '@nestjs/common';
import { CannabisServiceOperationalActivation, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CANNABIS_REASON_CODES } from '../cannabis-administration.constants';

export interface UpsertCannabisAdministrationConfigurationInput {
  jurisdictionId: string;
  licenceCategoryTaxonomy?: Prisma.InputJsonValue;
  serviceOperationalActivation?: CannabisServiceOperationalActivation;
  governingAuthorityInstrumentId?: string | null;
}

@Injectable()
export class CannabisAdministrationConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertConfiguration(input: UpsertCannabisAdministrationConfigurationInput) {
    return this.prisma.cannabisAdministrationConfiguration.upsert({
      where: { jurisdictionId: input.jurisdictionId },
      create: {
        jurisdictionId: input.jurisdictionId,
        licenceCategoryTaxonomy: input.licenceCategoryTaxonomy ?? [],
        serviceOperationalActivation:
          input.serviceOperationalActivation ?? CannabisServiceOperationalActivation.INACTIVE,
        governingAuthorityInstrumentId: input.governingAuthorityInstrumentId,
      },
      update: {
        licenceCategoryTaxonomy: input.licenceCategoryTaxonomy,
        serviceOperationalActivation: input.serviceOperationalActivation,
        governingAuthorityInstrumentId: input.governingAuthorityInstrumentId,
      },
    });
  }

  async assertServiceOperationalActivationAllowed(jurisdictionId: string): Promise<void> {
    const configuration = await this.prisma.cannabisAdministrationConfiguration.findUnique({
      where: { jurisdictionId },
    });
    if (!configuration) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.GOVERNING_AUTHORITY_NOT_CONFIGURED);
    }
    if (!configuration.governingAuthorityInstrumentId) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.GOVERNING_AUTHORITY_NOT_CONFIGURED);
    }
    if (configuration.serviceOperationalActivation !== CannabisServiceOperationalActivation.ACTIVE) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.SERVICE_NOT_OPERATIONALLY_ACTIVE);
    }
  }

  async resolveLicenceCategoryLabel(jurisdictionId: string, licenceCategoryCode: string) {
    const configuration = await this.prisma.cannabisAdministrationConfiguration.findUnique({
      where: { jurisdictionId },
    });
    if (!configuration) {
      return licenceCategoryCode;
    }
    const taxonomy = configuration.licenceCategoryTaxonomy as { code?: string; label?: string }[];
    const match = taxonomy.find((entry) => entry.code === licenceCategoryCode);
    return match?.label ?? licenceCategoryCode;
  }

  async assertLicenceCategoryConfigured(jurisdictionId: string, licenceCategoryCode: string) {
    const configuration = await this.prisma.cannabisAdministrationConfiguration.findUnique({
      where: { jurisdictionId },
    });
    if (!configuration) {
      return;
    }
    const taxonomy = configuration.licenceCategoryTaxonomy as { code?: string }[];
    if (taxonomy.length === 0) {
      return;
    }
    const allowed = taxonomy.some((entry) => entry.code === licenceCategoryCode);
    if (!allowed) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.LICENCE_CATEGORY_NOT_CONFIGURED);
    }
  }
}
