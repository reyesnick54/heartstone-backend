import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface UpsertDigitalAssetsConfigurationInput {
  jurisdictionId: string;
  activityCategoryTaxonomy?: Prisma.InputJsonValue;
  applicantCategoryTaxonomy?: Prisma.InputJsonValue;
  technicalReviewCategoryTaxonomy?: Prisma.InputJsonValue;
}

@Injectable()
export class DigitalAssetsConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertConfiguration(input: UpsertDigitalAssetsConfigurationInput) {
    return this.prisma.digitalAssetsConfiguration.upsert({
      where: { jurisdictionId: input.jurisdictionId },
      create: {
        jurisdictionId: input.jurisdictionId,
        activityCategoryTaxonomy: input.activityCategoryTaxonomy ?? [],
        applicantCategoryTaxonomy: input.applicantCategoryTaxonomy ?? [],
        technicalReviewCategoryTaxonomy: input.technicalReviewCategoryTaxonomy ?? [],
      },
      update: {
        activityCategoryTaxonomy: input.activityCategoryTaxonomy,
        applicantCategoryTaxonomy: input.applicantCategoryTaxonomy,
        technicalReviewCategoryTaxonomy: input.technicalReviewCategoryTaxonomy,
      },
    });
  }

  async resolveActivityCategoryLabel(jurisdictionId: string, activityCategoryCode: string) {
    const configuration = await this.prisma.digitalAssetsConfiguration.findUnique({
      where: { jurisdictionId },
    });
    if (!configuration) {
      return activityCategoryCode;
    }
    const taxonomy = configuration.activityCategoryTaxonomy as { code?: string; label?: string }[];
    const match = taxonomy.find((entry) => entry.code === activityCategoryCode);
    return match?.label ?? activityCategoryCode;
  }
}
