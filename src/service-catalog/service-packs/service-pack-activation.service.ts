import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  IntegrationAcceptanceStatus,
  ServiceActivationOutcome,
  ServicePackDeploymentAuditEventType,
  ServicePackDeploymentBindingDomain,
  ServicePackDeploymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceActivationService } from '../activation-governance/service-activation.service';
import { SERVICE_PACK_DEPLOYMENT_REASON_CODES } from './service-pack-deployment.constants';
import {
  type ServicePackActivationRequest,
  type ServicePackActivationResult,
} from './service-pack-deployment.types';
import { ServicePackDeploymentAuditService } from './service-pack-deployment-audit.service';

@Injectable()
export class ServicePackActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceActivationService: ServiceActivationService,
    private readonly auditService: ServicePackDeploymentAuditService,
  ) {}

  async requestActivation(
    request: ServicePackActivationRequest,
  ): Promise<ServicePackActivationResult> {
    const deployment = await this.loadDeployment(request.deploymentId);

    if (
      deployment.status !== ServicePackDeploymentStatus.DEPLOYED &&
      deployment.status !== ServicePackDeploymentStatus.OPERATIONALLY_INACTIVE
    ) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.DEPLOYMENT_NOT_DEPLOYED);
    }

    const blockedReasons = await this.assessActivationBlockers(deployment.id);
    if (blockedReasons.length > 0) {
      await this.auditService.recordEvent({
        deploymentId: deployment.id,
        eventType: ServicePackDeploymentAuditEventType.ACTIVATION_BLOCKED,
        actorIdentityId: request.actor.identityId,
        priorStatus: deployment.status,
        newStatus: deployment.status,
        reason: request.reason,
        metadata: { blockedReasons },
      });

      return {
        deploymentId: deployment.id,
        outcome: 'BLOCKED',
        priorStatus: deployment.status,
        newStatus: deployment.status,
        activatedServiceVersionIds: [],
        blockedReasons,
        activationRecordIds: [],
        message: 'Service pack activation blocked by governed readiness requirements',
      };
    }

    await this.auditService.recordEvent({
      deploymentId: deployment.id,
      eventType: ServicePackDeploymentAuditEventType.ACTIVATION_REQUESTED,
      actorIdentityId: request.actor.identityId,
      priorStatus: deployment.status,
      newStatus: deployment.status,
      reason: request.reason,
    });

    const serviceBindings = deployment.bindings.filter(
      (binding) => binding.domain === ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
    );

    const activatedServiceVersionIds: string[] = [];
    const activationRecordIds: string[] = [];

    for (const binding of serviceBindings) {
      const activationResult = await this.serviceActivationService.activateOperationally({
        governmentServiceVersionId: binding.domainEntityId,
        actor: request.actor,
        reason: request.reason,
        effectiveAt: request.effectiveAt,
      });

      if (activationResult.outcome !== ServiceActivationOutcome.ACTIVATED) {
        return {
          deploymentId: deployment.id,
          outcome: activationResult.outcome,
          priorStatus: deployment.status,
          newStatus: ServicePackDeploymentStatus.OPERATIONALLY_INACTIVE,
          activatedServiceVersionIds,
          blockedReasons: [activationResult.message],
          activationRecordIds,
          message:
            'Service pack activation delegated to governed domain services and blocked for at least one service',
        };
      }

      activatedServiceVersionIds.push(binding.domainEntityId);
      if (activationResult.activationRecordId) {
        activationRecordIds.push(activationResult.activationRecordId);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.servicePackDeploymentBinding.updateMany({
        where: {
          servicePackDeploymentId: deployment.id,
          domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
          domainEntityId: { in: activatedServiceVersionIds },
        },
        data: { isActivated: true },
      });

      const record = await tx.servicePackDeployment.update({
        where: { id: deployment.id },
        data: { status: ServicePackDeploymentStatus.ACTIVE },
      });

      await this.auditService.recordEvent(
        {
          deploymentId: deployment.id,
          eventType: ServicePackDeploymentAuditEventType.ACTIVATED,
          actorIdentityId: request.actor.identityId,
          priorStatus: deployment.status,
          newStatus: ServicePackDeploymentStatus.ACTIVE,
          reason: request.reason,
          metadata: {
            activatedServiceVersionIds,
            activationRecordIds,
          },
        },
        tx,
      );

      return record;
    });

    return {
      deploymentId: updated.id,
      outcome: 'ACTIVATED',
      priorStatus: deployment.status,
      newStatus: ServicePackDeploymentStatus.ACTIVE,
      activatedServiceVersionIds,
      blockedReasons: [],
      activationRecordIds,
      message:
        'Service pack activation completed via governed domain activation services without direct status mutation',
    };
  }

  async assessActivationBlockers(deploymentId: string): Promise<string[]> {
    const deployment = await this.loadDeployment(deploymentId);
    const blockers: string[] = [];

    const serviceBindings = deployment.bindings.filter(
      (binding) => binding.domain === ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
    );

    for (const binding of serviceBindings) {
      const version = await this.prisma.governmentServiceVersion.findUnique({
        where: { id: binding.domainEntityId },
        include: {
          functionMappings: {
            include: { functionAuthorityRecord: true },
          },
        },
      });
      if (!version) {
        blockers.push(
          `${SERVICE_PACK_DEPLOYMENT_REASON_CODES.UNRESOLVED_DEPENDENCY}:${binding.domainEntityId}`,
        );
        continue;
      }

      const suspendedAuthority = version.functionMappings.find(
        (mapping) =>
          mapping.functionAuthorityRecord.lifecycleStatus ===
          FunctionAuthorityLifecycleStatus.SUSPENDED,
      );
      if (suspendedAuthority) {
        blockers.push(SERVICE_PACK_DEPLOYMENT_REASON_CODES.SUSPENDED_AUTHORITY_BLOCKS);
      }

      if (
        Array.isArray(version.majorDependencies) &&
        version.majorDependencies.some(
          (dependency) =>
            typeof dependency === 'object' &&
            dependency !== null &&
            'resolved' in dependency &&
            (dependency as { resolved?: boolean }).resolved === false,
        )
      ) {
        blockers.push(SERVICE_PACK_DEPLOYMENT_REASON_CODES.UNRESOLVED_DEPENDENCY);
      }

      if (version.maturityStatus === GovernmentServiceMaturityStatus.ACTIVE) {
        continue;
      }
    }

    const integrationBindings = deployment.bindings.filter(
      (binding) => binding.domain === ServicePackDeploymentBindingDomain.INTEGRATION_REFERENCES,
    );

    for (const binding of integrationBindings) {
      const acceptance = await this.prisma.integrationAcceptanceRecord.findFirst({
        where: {
          integrationDefinitionId: binding.domainEntityId,
          acceptanceStatus: {
            in: [
              IntegrationAcceptanceStatus.INSTITUTIONALLY_ACCEPTED,
              IntegrationAcceptanceStatus.OPERATIONALLY_ACTIVE,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!acceptance) {
        blockers.push(SERVICE_PACK_DEPLOYMENT_REASON_CODES.INTEGRATION_ACCEPTANCE_REQUIRED);
      }
    }

    return [...new Set(blockers)];
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
