import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface UpsertMaritimeConfigurationInput {
  jurisdictionId: string;
  vesselTypeCategoryTaxonomy?: Prisma.InputJsonValue;
  serviceCategoryTaxonomy?: Prisma.InputJsonValue;
  applicantCategoryTaxonomy?: Prisma.InputJsonValue;
  publicVerificationModeCode?: string;
}

@Injectable()
export class MaritimeConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertConfiguration(input: UpsertMaritimeConfigurationInput) {
    return this.prisma.maritimeConfiguration.upsert({
      where: { jurisdictionId: input.jurisdictionId },
      create: {
        jurisdictionId: input.jurisdictionId,
        vesselTypeCategoryTaxonomy: input.vesselTypeCategoryTaxonomy ?? [],
        serviceCategoryTaxonomy: input.serviceCategoryTaxonomy ?? [],
        applicantCategoryTaxonomy: input.applicantCategoryTaxonomy ?? [],
        publicVerificationModeCode: input.publicVerificationModeCode ?? 'MINIMAL',
      },
      update: {
        vesselTypeCategoryTaxonomy: input.vesselTypeCategoryTaxonomy,
        serviceCategoryTaxonomy: input.serviceCategoryTaxonomy,
        applicantCategoryTaxonomy: input.applicantCategoryTaxonomy,
        publicVerificationModeCode: input.publicVerificationModeCode,
      },
    });
  }

  async resolveVesselTypeCategoryLabel(jurisdictionId: string, code: string) {
    const configuration = await this.prisma.maritimeConfiguration.findUnique({
      where: { jurisdictionId },
    });
    const taxonomy = (configuration?.vesselTypeCategoryTaxonomy ?? []) as {
      code?: string;
      label?: string;
    }[];
    const entry = taxonomy.find((item) => item.code === code);
    return { code, label: entry?.label ?? code, configured: Boolean(entry) };
  }
}
