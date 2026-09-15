import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RollbackExecutionStatus, RollbackPlanStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

@Injectable()
export class RollbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createRollbackPlan(input: {
    releaseDefinitionId: string;
    targetArtifactDigest: string;
    databaseStrategy?: Record<string, unknown>;
    externalTransactionStrategy?: Record<string, unknown>;
  }) {
    return this.prisma.rollbackPlan.create({
      data: {
        releaseDefinitionId: input.releaseDefinitionId,
        targetArtifactDigest: input.targetArtifactDigest,
        databaseStrategy: {
          preserveOfficialRecords: true,
          ...(input.databaseStrategy ?? {}),
        },
        externalTransactionStrategy: (input.externalTransactionStrategy ??
          {}) as Prisma.InputJsonValue,
        preservesOfficialRecords: true,
        status: RollbackPlanStatus.APPROVED,
      },
    });
  }

  async executeRollback(input: {
    rollbackPlanId: string;
    deploymentRecordId: string;
    initiatedByIdentityId: string;
    notes?: string;
  }) {
    const plan = await this.prisma.rollbackPlan.findUniqueOrThrow({
      where: { id: input.rollbackPlanId },
    });

    this.boundary.assertRollbackPreservesOfficialRecords(plan.preservesOfficialRecords);

    const databaseStrategy = plan.databaseStrategy as Record<string, unknown>;
    if (databaseStrategy.destroyOfficialRecords === true) {
      throw new BadRequestException(
        'Rollback cannot destroy official records merely to restore application code',
      );
    }

    return this.prisma.rollbackExecution.create({
      data: {
        rollbackPlanId: input.rollbackPlanId,
        deploymentRecordId: input.deploymentRecordId,
        initiatedByIdentityId: input.initiatedByIdentityId,
        status: RollbackExecutionStatus.COMPLETED,
        preservesOfficialRecords: true,
        executedAt: new Date(),
        notes: input.notes,
      },
    });
  }
}
