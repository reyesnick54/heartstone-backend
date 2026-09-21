import { Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, type ServicePackDeploymentAuditRecord } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ServicePackDeploymentAuditEventInput } from './service-pack-deployment.types';

@Injectable()
export class ServicePackDeploymentAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    input: ServicePackDeploymentAuditEventInput,
    tx?: Pick<PrismaService, 'servicePackDeploymentAuditRecord'>,
  ): Promise<ServicePackDeploymentAuditRecord> {
    const client = tx ?? this.prisma;
    return client.servicePackDeploymentAuditRecord.create({
      data: {
        servicePackDeploymentId: input.deploymentId,
        eventType: input.eventType,
        priorStatus: input.priorStatus ?? undefined,
        newStatus: input.newStatus ?? undefined,
        actorIdentityId: input.actorIdentityId,
        reason: input.reason,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async getAuditTrail(deploymentId: string): Promise<ServicePackDeploymentAuditRecord[]> {
    await this.assertDeploymentExists(deploymentId);
    return this.prisma.servicePackDeploymentAuditRecord.findMany({
      where: { servicePackDeploymentId: deploymentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDeploymentHistory(
    servicePackVersionId: string,
  ): Promise<ServicePackDeploymentAuditRecord[]> {
    const deployments = await this.prisma.servicePackDeployment.findMany({
      where: { servicePackVersionId },
      select: { id: true },
    });

    if (deployments.length === 0) {
      return [];
    }

    return this.prisma.servicePackDeploymentAuditRecord.findMany({
      where: {
        servicePackDeploymentId: { in: deployments.map((deployment) => deployment.id) },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertDeploymentExists(deploymentId: string): Promise<void> {
    const deployment = await this.prisma.servicePackDeployment.findUnique({
      where: { id: deploymentId },
      select: { id: true },
    });
    if (!deployment) {
      throw new NotFoundException(`ServicePackDeployment "${deploymentId}" was not found`);
    }
  }
}
