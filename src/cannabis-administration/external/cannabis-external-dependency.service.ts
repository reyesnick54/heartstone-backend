import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  CannabisExternalDependencyRecordedBy,
  CannabisExternalDependencyStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CannabisAdministrationBoundaryService } from '../common/cannabis-administration-boundary.service';

@Injectable()
export class CannabisExternalDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CannabisAdministrationBoundaryService,
  ) {}

  async assertLicenceDecisionAllowed(regulatedEntityId: string): Promise<void> {
    const dependencies = await this.prisma.cannabisExternalDependency.findMany({
      where: { regulatedEntityId },
    });
    this.boundary.assertExternalDependenciesResolved(dependencies);
  }

  async recordExternalDependency(input: {
    regulatedEntityId: string;
    dependencyCode: string;
    dependencyLabel?: string;
    status?: CannabisExternalDependencyStatus;
    blocksFinalDecision?: boolean;
    recordedBy: CannabisExternalDependencyRecordedBy;
    recordedByIdentityId?: string;
    responseAttributionSummary?: string;
  }) {
    return this.prisma.cannabisExternalDependency.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        dependencyCode: input.dependencyCode,
        dependencyLabel: input.dependencyLabel,
        status: input.status ?? CannabisExternalDependencyStatus.PENDING,
        blocksFinalDecision: input.blocksFinalDecision ?? true,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
        responseAttributionSummary: input.responseAttributionSummary,
      },
    });
  }
}
