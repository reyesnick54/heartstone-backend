import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PUBLICLY_PRESENTABLE_AVAILABILITY } from '../common/public-discovery.constants';

const versionWithRulesInclude = {
  governmentService: true,
  serviceEligibilityRules: true,
} satisfies Prisma.GovernmentServiceVersionInclude;

export type EligibilityVersionWithRules = Prisma.GovernmentServiceVersionGetPayload<{
  include: typeof versionWithRulesInclude;
}>;

@Injectable()
export class EligibilityVersionAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getVersionById(versionId: string): Promise<EligibilityVersionWithRules> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: versionId },
      include: versionWithRulesInclude,
    });

    if (!version) {
      throw new NotFoundException(`Government service version ${versionId} not found`);
    }

    return version;
  }

  async getCurrentPublishedVersion(serviceId: string): Promise<EligibilityVersionWithRules | null> {
    const now = new Date();
    const versions = await this.prisma.governmentServiceVersion.findMany({
      where: {
        governmentServiceId: serviceId,
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: { in: PUBLICLY_PRESENTABLE_AVAILABILITY },
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          {
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
        ],
      },
      include: versionWithRulesInclude,
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return versions[0] ?? null;
  }

  isPubliclyPresentableVersion(
    maturityStatus: GovernmentServiceMaturityStatus,
    publicAvailability: GovernmentServicePublicAvailability,
  ): boolean {
    return (
      maturityStatus === GovernmentServiceMaturityStatus.ACTIVE &&
      PUBLICLY_PRESENTABLE_AVAILABILITY.includes(publicAvailability)
    );
  }

  extractDependencyCodes(majorDependencies: Prisma.JsonValue): string[] {
    if (!Array.isArray(majorDependencies)) {
      return [];
    }

    const codes: string[] = [];
    for (const dependency of majorDependencies) {
      if (typeof dependency === 'string') {
        codes.push(dependency);
        continue;
      }

      if (typeof dependency === 'object' && dependency !== null) {
        const record = dependency as Record<string, unknown>;
        if (typeof record.code === 'string') {
          codes.push(record.code);
        } else if (typeof record.serviceCode === 'string') {
          codes.push(record.serviceCode);
        }
      }
    }

    return codes;
  }

  extractRelatedServiceCodes(majorDependencies: Prisma.JsonValue): string[] {
    return this.extractDependencyCodes(majorDependencies);
  }
}
