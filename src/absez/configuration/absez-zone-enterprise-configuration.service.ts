import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ABSEZ_ZONE_ENTERPRISE_DEFAULT_CONFIGURATION_KEY } from '../absez.constants';

export interface AbsezActivityCategoryDefinition {
  code: string;
  label: string;
}

const DEFAULT_ACTIVITY_CATEGORIES: AbsezActivityCategoryDefinition[] = [
  { code: 'MANUFACTURING', label: 'Manufacturing' },
  { code: 'LOGISTICS', label: 'Logistics and distribution' },
  { code: 'TECHNOLOGY', label: 'Technology services' },
  { code: 'HOSPITALITY', label: 'Hospitality (configured template)' },
];

@Injectable()
export class AbsezZoneEnterpriseConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultConfiguration() {
    return this.prisma.absezZoneEnterpriseConfiguration.upsert({
      where: { configurationKey: ABSEZ_ZONE_ENTERPRISE_DEFAULT_CONFIGURATION_KEY },
      create: {
        configurationKey: ABSEZ_ZONE_ENTERPRISE_DEFAULT_CONFIGURATION_KEY,
        activityCategories: DEFAULT_ACTIVITY_CATEGORIES as unknown as Prisma.InputJsonValue,
        zoneStatusCatalog: [
          'DRAFT',
          'PENDING_LICENCE',
          'LICENSED',
          'SUSPENDED',
          'EXITED',
        ] as Prisma.InputJsonValue,
        operatingStatusCatalog: [
          'NOT_OPERATING',
          'OPERATING',
          'SUSPENDED',
          'CEASED',
        ] as Prisma.InputJsonValue,
      },
      update: {},
    });
  }

  async listActivityCategories(): Promise<AbsezActivityCategoryDefinition[]> {
    const configuration = await this.ensureDefaultConfiguration();
    const categories =
      configuration.activityCategories as unknown as AbsezActivityCategoryDefinition[];
    return categories;
  }

  async assertActivityCategoriesPermitted(codes: string[]): Promise<void> {
    const permitted = new Set((await this.listActivityCategories()).map((entry) => entry.code));
    for (const code of codes) {
      if (!permitted.has(code)) {
        throw new BadRequestException(
          `Activity category ${code} is not defined in ABSEZ zone enterprise configuration`,
        );
      }
    }
  }
}
