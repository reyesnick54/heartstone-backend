import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ServicePackComponentKind,
  ServicePackDeploymentBindingDomain,
  ServicePackDeploymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ServicePackUpgradePlan {
  servicePackId: string;
  targetVersionId: string;
  dryRun: true;
  affectedServices: string[];
  affectedWorkflows: string[];
  affectedForms: string[];
  affectedIntegrations: string[];
  affectedAuthorityMappings: string[];
  activeCasesPinnedToOlderVersions: {
    caseId: string;
    governmentServiceVersionId: string;
    configurationFingerprint: string;
  }[];
  migrationRisks: string[];
  rollbackConstraints: string[];
  requiredReviews: string[];
}

@Injectable()
export class ServicePackUpgradePlanService {
  constructor(private readonly prisma: PrismaService) {}

  async buildUpgradePlan(input: {
    servicePackId: string;
    targetVersionId: string;
  }): Promise<ServicePackUpgradePlan> {
    const targetVersion = await this.prisma.servicePackVersion.findFirst({
      where: {
        id: input.targetVersionId,
        servicePackId: input.servicePackId,
      },
      include: {
        components: true,
        deployments: {
          include: { bindings: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!targetVersion) {
      throw new NotFoundException('Target service pack version not found for upgrade planning');
    }

    const priorActiveDeployment = await this.prisma.servicePackDeployment.findFirst({
      where: {
        servicePackVersion: { servicePackId: input.servicePackId },
        status: {
          in: [ServicePackDeploymentStatus.ACTIVE, ServicePackDeploymentStatus.DEPLOYED],
        },
        NOT: { servicePackVersionId: input.targetVersionId },
      },
      include: { bindings: true, servicePackVersion: true },
      orderBy: { createdAt: 'desc' },
    });

    const priorServiceVersionIds =
      priorActiveDeployment?.bindings
        .filter((binding) => binding.domain === ServicePackDeploymentBindingDomain.SERVICE_CATALOG)
        .map((binding) => binding.domainEntityId) ?? [];

    const pinnedCases =
      priorServiceVersionIds.length > 0
        ? await this.prisma.case.findMany({
            where: { governmentServiceVersionId: { in: priorServiceVersionIds } },
            select: {
              id: true,
              governmentServiceVersionId: true,
              configurationFingerprint: true,
            },
            take: 100,
          })
        : [];

    const affectedServices = targetVersion.components
      .filter((component) => component.componentKind === ServicePackComponentKind.SERVICE)
      .map((component) => component.componentCode);

    const affectedWorkflows = targetVersion.components
      .filter((component) => component.componentKind === ServicePackComponentKind.WORKFLOW)
      .map((component) => component.componentCode);

    const affectedForms = targetVersion.components
      .filter((component) => component.componentKind === ServicePackComponentKind.FORM)
      .map((component) => component.componentCode);

    const affectedIntegrations = targetVersion.components
      .filter((component) => component.componentKind === ServicePackComponentKind.INTEGRATION)
      .map((component) => component.componentCode);

    const affectedAuthorityMappings = targetVersion.components
      .filter((component) => component.componentKind === ServicePackComponentKind.AUTHORITY_MAPPING)
      .map((component) => component.componentCode);

    const migrationRisks: string[] = [];
    if (pinnedCases.length > 0) {
      migrationRisks.push(
        'Active historical cases remain pinned to prior service configuration versions',
      );
    }
    if (priorActiveDeployment?.bindings.some((binding) => binding.isActivated)) {
      migrationRisks.push(
        'Prior deployment includes activated bindings requiring supersession review',
      );
    }

    const rollbackConstraints: string[] = [];
    if (priorActiveDeployment?.bindings.some((binding) => !binding.isReversible)) {
      rollbackConstraints.push('Non-reversible deployment bindings constrain rollback');
    }
    if (pinnedCases.length > 0) {
      rollbackConstraints.push(
        'Historical applications must remain on prior configuration if rollback occurs',
      );
    }

    const requiredReviews = [
      'Institutional acceptance review for target version',
      'Authority mapping revalidation where jurisdiction policy differs',
      'Operational activation readiness review',
    ];

    return {
      servicePackId: input.servicePackId,
      targetVersionId: input.targetVersionId,
      dryRun: true,
      affectedServices,
      affectedWorkflows,
      affectedForms,
      affectedIntegrations,
      affectedAuthorityMappings,
      activeCasesPinnedToOlderVersions: pinnedCases.map((record) => ({
        caseId: record.id,
        governmentServiceVersionId: record.governmentServiceVersionId,
        configurationFingerprint: record.configurationFingerprint,
      })),
      migrationRisks,
      rollbackConstraints,
      requiredReviews,
    };
  }
}
