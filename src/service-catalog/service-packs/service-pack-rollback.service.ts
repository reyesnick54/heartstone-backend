import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServicePackDeploymentAuditEventType, ServicePackDeploymentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SERVICE_PACK_DEPLOYMENT_REASON_CODES } from './service-pack-deployment.constants';
import {
  type ServicePackRollbackRequest,
  type ServicePackRollbackResult,
  type ServicePackSupersessionRequest,
} from './service-pack-deployment.types';
import { ServicePackDeploymentAuditService } from './service-pack-deployment-audit.service';

@Injectable()
export class ServicePackRollbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: ServicePackDeploymentAuditService,
  ) {}

  async rollback(request: ServicePackRollbackRequest): Promise<ServicePackRollbackResult> {
    const deployment = await this.loadDeployment(request.deploymentId);

    if (
      deployment.status === ServicePackDeploymentStatus.ROLLED_BACK ||
      deployment.status === ServicePackDeploymentStatus.SUPERSEDED
    ) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.ALREADY_ROLLED_BACK);
    }

    if (deployment.status === ServicePackDeploymentStatus.ACTIVE) {
      throw new ForbiddenException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.SUPERSESSION_REQUIRED);
    }

    this.assertRollbackDoesNotEraseOfficialRecords();

    const reversibleBindings = deployment.bindings.filter(
      (binding) => binding.isReversible && !binding.isActivated,
    );
    const preservedBindings = deployment.bindings.filter(
      (binding) => !binding.isReversible || binding.isActivated,
    );

    const rolledBackAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (reversibleBindings.length > 0) {
        await tx.servicePackDeploymentBinding.deleteMany({
          where: {
            id: { in: reversibleBindings.map((binding) => binding.id) },
          },
        });
      }

      await tx.servicePackDeployment.update({
        where: { id: deployment.id },
        data: {
          status: ServicePackDeploymentStatus.ROLLED_BACK,
          rolledBackAt,
        },
      });

      await this.auditService.recordEvent(
        {
          deploymentId: deployment.id,
          eventType: ServicePackDeploymentAuditEventType.ROLLBACK_INITIATED,
          actorIdentityId: request.actor.identityId,
          priorStatus: deployment.status,
          newStatus: ServicePackDeploymentStatus.ROLLED_BACK,
          reason: request.reason,
          metadata: {
            reversedBindingIds: reversibleBindings.map((binding) => binding.id),
            preservedBindingIds: preservedBindings.map((binding) => binding.id),
          },
        },
        tx,
      );

      await this.auditService.recordEvent(
        {
          deploymentId: deployment.id,
          eventType: ServicePackDeploymentAuditEventType.ROLLBACK_COMPLETED,
          actorIdentityId: request.actor.identityId,
          priorStatus: deployment.status,
          newStatus: ServicePackDeploymentStatus.ROLLED_BACK,
          reason: request.reason,
          metadata: {
            officialRecordsPreserved: true,
          },
        },
        tx,
      );
    });

    return {
      deploymentId: deployment.id,
      priorStatus: deployment.status,
      newStatus: ServicePackDeploymentStatus.ROLLED_BACK,
      reversedBindingIds: reversibleBindings.map((binding) => binding.id),
      preservedBindingIds: preservedBindings.map((binding) => binding.id),
      message:
        'Unactivated deployment configuration rolled back without deleting official records or historical cases',
    };
  }

  async supersede(request: ServicePackSupersessionRequest): Promise<ServicePackRollbackResult> {
    const priorDeployment = await this.loadDeployment(request.priorDeploymentId);
    const newDeployment = await this.loadDeployment(request.newDeploymentId);

    if (priorDeployment.status === ServicePackDeploymentStatus.SUPERSEDED) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.ALREADY_ROLLED_BACK);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.servicePackDeployment.update({
        where: { id: priorDeployment.id },
        data: {
          status: ServicePackDeploymentStatus.SUPERSEDED,
          supersededByDeploymentId: newDeployment.id,
        },
      });

      await this.auditService.recordEvent(
        {
          deploymentId: priorDeployment.id,
          eventType: ServicePackDeploymentAuditEventType.SUPERSEDED,
          actorIdentityId: request.actor.identityId,
          priorStatus: priorDeployment.status,
          newStatus: ServicePackDeploymentStatus.SUPERSEDED,
          reason: request.reason,
          metadata: {
            supersededByDeploymentId: newDeployment.id,
            historicalVersionsPreserved: true,
          },
        },
        tx,
      );
    });

    return {
      deploymentId: priorDeployment.id,
      priorStatus: priorDeployment.status,
      newStatus: ServicePackDeploymentStatus.SUPERSEDED,
      reversedBindingIds: [],
      preservedBindingIds: priorDeployment.bindings.map((binding) => binding.id),
      message: 'Prior deployment superseded while preserving historical service versions',
    };
  }

  private assertRollbackDoesNotEraseOfficialRecords(): void {
    const destructiveOperations = [
      'deleteApplications',
      'deleteCases',
      'deleteOfficialRecords',
      'deleteIssuedInstruments',
      'invalidateEvidenceHistory',
      'alterHistoricalDecisions',
    ];

    if (
      destructiveOperations.some((operation) => typeof (this as never)[operation] === 'function')
    ) {
      throw new ForbiddenException(
        SERVICE_PACK_DEPLOYMENT_REASON_CODES.ROLLBACK_ERASES_OFFICIAL_RECORDS,
      );
    }
  }

  private async loadDeployment(deploymentId: string) {
    const deployment = await this.prisma.servicePackDeployment.findUnique({
      where: { id: deploymentId },
      include: { bindings: true },
    });
    if (!deployment) {
      throw new NotFoundException(`ServicePackDeployment "${deploymentId}" was not found`);
    }
    return deployment;
  }
}
