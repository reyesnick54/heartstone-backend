import { Injectable } from '@nestjs/common';
import { DependencyHealthState, DependencyType, TechnicalHealthState } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { TECHNICAL_HEALTH_DISCLAIMER } from '../production-reliability.constants';

export interface DependencyHealthCheck {
  dependencyType: DependencyType;
  reference: string;
  state: DependencyHealthState;
  isStale: boolean;
  unrelatedCapabilitiesMarkedUnusable: string[];
}

export interface ServiceHealthResult {
  technicalHealthState: TechnicalHealthState;
  liveness: 'LIVE' | 'NOT_LIVE';
  readiness: 'READY' | 'NOT_READY';
  disclaimer: string;
  notInstitutionalStatus: true;
  dependencies: DependencyHealthCheck[];
  degradedCapabilities: string[];
}

@Injectable()
export class ServiceHealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly boundary: ProductionReliabilityBoundaryService,
  ) {}

  async assessTechnicalHealth(): Promise<ServiceHealthResult> {
    const [databaseUp, redisUp] = await Promise.all([
      this.prismaService.isHealthy(),
      this.checkRedis(),
    ]);

    const dependencies: DependencyHealthCheck[] = [
      {
        dependencyType: DependencyType.DATABASE,
        reference: 'postgresql',
        state: databaseUp ? DependencyHealthState.HEALTHY : DependencyHealthState.UNAVAILABLE,
        isStale: false,
        unrelatedCapabilitiesMarkedUnusable: [],
      },
      {
        dependencyType: DependencyType.CACHE,
        reference: 'redis',
        state: redisUp ? DependencyHealthState.HEALTHY : DependencyHealthState.UNAVAILABLE,
        isStale: false,
        unrelatedCapabilitiesMarkedUnusable: [],
      },
    ];

    const degradedCapabilities = dependencies
      .filter((d) => d.state !== DependencyHealthState.HEALTHY)
      .map((d) => d.reference);

    for (const dep of dependencies) {
      if (dep.state === DependencyHealthState.UNAVAILABLE) {
        this.boundary.assertDependencyOutageIsolated(
          dep.reference,
          dep.unrelatedCapabilitiesMarkedUnusable,
          dep.dependencyType,
        );
      }
      this.boundary.assertStaleIntegrationSurfaced(dep.isStale, true);
    }

    const liveness = 'LIVE';
    let technicalHealthState: TechnicalHealthState;
    let readiness: 'READY' | 'NOT_READY';

    if (!databaseUp) {
      technicalHealthState = TechnicalHealthState.NOT_READY;
      readiness = 'NOT_READY';
    } else if (!redisUp) {
      technicalHealthState = TechnicalHealthState.DEGRADED;
      readiness = 'READY';
    } else {
      technicalHealthState = TechnicalHealthState.READY;
      readiness = 'READY';
    }

    this.boundary.assertTechnicalHealthNotInstitutionalAcceptance(false);

    return {
      technicalHealthState,
      liveness,
      readiness,
      disclaimer: TECHNICAL_HEALTH_DISCLAIMER,
      notInstitutionalStatus: true,
      dependencies,
      degradedCapabilities,
    };
  }

  recordDependencyHealth(input: {
    dependencyType: DependencyType;
    reference: string;
    state: DependencyHealthState;
    isStale: boolean;
    unrelatedCapabilitiesMarkedUnusable?: string[];
  }): DependencyHealthCheck {
    const check: DependencyHealthCheck = {
      dependencyType: input.dependencyType,
      reference: input.reference,
      state: input.state,
      isStale: input.isStale,
      unrelatedCapabilitiesMarkedUnusable: input.unrelatedCapabilitiesMarkedUnusable ?? [],
    };

    if (input.state === DependencyHealthState.UNAVAILABLE) {
      this.boundary.assertDependencyOutageIsolated(
        input.reference,
        check.unrelatedCapabilitiesMarkedUnusable,
        input.dependencyType,
      );
    }

    this.boundary.assertStaleIntegrationSurfaced(input.isStale, true);

    return check;
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redisService.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
