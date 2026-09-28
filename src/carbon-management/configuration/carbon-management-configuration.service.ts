import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CARBON_MARKET_MECHANICS_EXTENSION_DEFAULT } from '../carbon-management.constants';

export interface UpsertCarbonManagementConfigurationInput {
  jurisdictionId: string;
  programmeCategoryTaxonomy?: Prisma.InputJsonValue;
  projectCategoryTaxonomy?: Prisma.InputJsonValue;
  verificationCategoryTaxonomy?: Prisma.InputJsonValue;
  configurableCreditUnitTaxonomy?: Prisma.InputJsonValue;
  marketMechanicsExtensionModeCode?: string;
}

@Injectable()
export class CarbonManagementConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertConfiguration(input: UpsertCarbonManagementConfigurationInput) {
    return this.prisma.carbonManagementConfiguration.upsert({
      where: { jurisdictionId: input.jurisdictionId },
      create: {
        jurisdictionId: input.jurisdictionId,
        programmeCategoryTaxonomy: input.programmeCategoryTaxonomy ?? [],
        projectCategoryTaxonomy: input.projectCategoryTaxonomy ?? [],
        verificationCategoryTaxonomy: input.verificationCategoryTaxonomy ?? [],
        configurableCreditUnitTaxonomy: input.configurableCreditUnitTaxonomy ?? [],
        marketMechanicsExtensionModeCode:
          input.marketMechanicsExtensionModeCode ?? CARBON_MARKET_MECHANICS_EXTENSION_DEFAULT,
      },
      update: {
        programmeCategoryTaxonomy: input.programmeCategoryTaxonomy,
        projectCategoryTaxonomy: input.projectCategoryTaxonomy,
        verificationCategoryTaxonomy: input.verificationCategoryTaxonomy,
        configurableCreditUnitTaxonomy: input.configurableCreditUnitTaxonomy,
        marketMechanicsExtensionModeCode: input.marketMechanicsExtensionModeCode,
      },
    });
  }

  async resolveProjectCategoryLabel(jurisdictionId: string, projectCategoryCode: string) {
    const configuration = await this.prisma.carbonManagementConfiguration.findUnique({
      where: { jurisdictionId },
    });
    if (!configuration) {
      return projectCategoryCode;
    }
    const taxonomy = configuration.projectCategoryTaxonomy as { code?: string; label?: string }[];
    const match = taxonomy.find((entry) => entry.code === projectCategoryCode);
    return match?.label ?? projectCategoryCode;
  }

  async getMarketMechanicsExtensionMode(jurisdictionId: string): Promise<string> {
    const configuration = await this.prisma.carbonManagementConfiguration.findUnique({
      where: { jurisdictionId },
    });
    return (
      configuration?.marketMechanicsExtensionModeCode ?? CARBON_MARKET_MECHANICS_EXTENSION_DEFAULT
    );
  }
}
