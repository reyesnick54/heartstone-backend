import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

/**
 * Single governance registry path: ServicePack + ServicePackVersion in Prisma.
 * Deployment lifecycle in service-catalog must reference these rows, not parallel registries.
 */
@Injectable()
export class ServicePackCanonicalGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPackRegistered(servicePackId: string): Promise<void> {
    const pack = await this.prisma.servicePack.findUnique({ where: { id: servicePackId } });
    if (!pack) {
      throw new BadRequestException(
        `Service pack ${servicePackId} is not registered in the canonical ServicePack registry`,
      );
    }
  }

  async assertVersionBelongsToPack(
    servicePackId: string,
    servicePackVersionId: string,
  ): Promise<void> {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: servicePackVersionId },
      select: { servicePackId: true },
    });

    if (version?.servicePackId !== servicePackId) {
      throw new BadRequestException(
        'Service pack version is not registered under the canonical pack identifier',
      );
    }
  }

  async assertNoDuplicatePackCode(packCode: string, excludeServicePackId?: string): Promise<void> {
    const existing = await this.prisma.servicePack.findFirst({
      where: {
        code: packCode,
        ...(excludeServicePackId ? { NOT: { id: excludeServicePackId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Duplicate service pack code "${packCode}" would diverge canonical registry state`,
      );
    }
  }
}
