import { Injectable } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface OperationalServiceSummary {
  governmentServiceVersionId: string;
  governmentServiceId: string;
  serviceCode: string;
  version: string;
  maturityStatus: GovernmentServiceMaturityStatus;
  publicAvailability: GovernmentServicePublicAvailability;
  publicName: string;
  pilotScopeDescription: string | null;
}

@Injectable()
export class OperationalServiceDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveServices(at: Date = new Date()): Promise<OperationalServiceSummary[]> {
    const versions = await this.prisma.governmentServiceVersion.findMany({
      where: {
        maturityStatus: {
          in: [GovernmentServiceMaturityStatus.ACTIVE, GovernmentServiceMaturityStatus.ACCEPTED],
        },
        publicAvailability: {
          in: [
            GovernmentServicePublicAvailability.ACTIVE,
            GovernmentServicePublicAvailability.PILOT_ONLY,
          ],
        },
        effectiveFrom: { lte: at },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }],
      },
      include: { governmentService: true },
      orderBy: [{ governmentService: { code: 'asc' } }, { version: 'asc' }],
    });

    return versions.map((version) => ({
      governmentServiceVersionId: version.id,
      governmentServiceId: version.governmentServiceId,
      serviceCode: version.governmentService.code,
      version: version.version,
      maturityStatus: version.maturityStatus,
      publicAvailability: version.publicAvailability,
      publicName: version.governmentService.publicName,
      pilotScopeDescription: version.pilotScopeDescription,
    }));
  }

  async getServiceVersionHistory(governmentServiceId: string) {
    return this.prisma.governmentServiceVersion.findMany({
      where: { governmentServiceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
