import { Injectable } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogCacheService } from './service-catalog-cache.service';

@Injectable()
export class ServiceCatalogLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ServiceCatalogCacheService,
  ) {}

  async suspendServiceVersion(governmentServiceVersionId: string): Promise<void> {
    const version = await this.prisma.governmentServiceVersion.update({
      where: { id: governmentServiceVersionId },
      data: {
        maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
        publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
      },
      include: {
        governmentService: {
          select: { slug: true },
        },
      },
    });

    await this.cacheService.invalidateService(version.governmentService.slug);
  }
}
