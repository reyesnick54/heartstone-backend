import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ServicePackComponentKind,
  ServicePackDeploymentStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  type ServicePackRegistryEntry,
  type ServicePackRegistryInventorySnapshot,
} from './service-pack-registry.types';

const packWithRelationsInclude = {
  versions: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      components: true,
      dependencies: true,
      validationResults: { orderBy: { validatedAt: 'desc' as const }, take: 1 },
      deployments: {
        orderBy: { createdAt: 'desc' as const },
        include: { supersededByDeployment: true },
      },
    },
  },
} satisfies Prisma.ServicePackInclude;

type PackWithRelations = Prisma.ServicePackGetPayload<{ include: typeof packWithRelationsInclude }>;

@Injectable()
export class ServicePackInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async loadPacks(filter: {
    jurisdictionId?: string;
    institutionId?: string;
    servicePackId?: string;
  }) {
    return this.prisma.servicePack.findMany({
      where: {
        id: filter.servicePackId,
        jurisdictionId: filter.jurisdictionId,
        institutionId: filter.institutionId,
      },
      include: packWithRelationsInclude,
      orderBy: { code: 'asc' },
    });
  }

  buildInventorySnapshot(
    entries: ServicePackRegistryEntry[],
  ): ServicePackRegistryInventorySnapshot {
    const activeVersions = entries.flatMap((entry) =>
      entry.activeVersionId
        ? [
            {
              servicePackId: entry.id,
              versionId: entry.activeVersionId,
              version:
                entry.versions.find((version) => version.id === entry.activeVersionId)?.version ??
                '',
            },
          ]
        : [],
    );

    const pendingUpgrades = entries.flatMap((entry) => {
      const active = entry.versions.find((version) => version.id === entry.activeVersionId);
      const candidate = entry.versions.find(
        (version) => !version.superseded && version.id !== entry.activeVersionId,
      );
      if (!active || !candidate) {
        return [];
      }
      return [
        {
          servicePackId: entry.id,
          currentVersionId: active.id,
          candidateVersionId: candidate.id,
        },
      ];
    });

    const suspendedPacks = entries.flatMap((entry) =>
      entry.activationState === ServicePackDeploymentStatus.SUSPENDED && entry.activeVersionId
        ? [
            {
              servicePackId: entry.id,
              deploymentId:
                entry.versions.find((v) => v.id === entry.activeVersionId)?.activeDeploymentId ??
                '',
            },
          ]
        : [],
    );

    const supersededPacks = entries.flatMap((entry) =>
      entry.supersededVersionIds.map((versionId) => ({
        servicePackId: entry.id,
        versionId,
        deploymentId:
          entry.versions.find((version) => version.id === versionId)?.activeDeploymentId ?? '',
      })),
    );

    const unresolvedDependencies = entries.flatMap((entry) =>
      entry.unresolvedDependencyCount > 0
        ? entry.versions.flatMap((version) =>
            version.dependencyCount > 0
              ? [
                  {
                    servicePackId: entry.id,
                    versionId: version.id,
                    dependencyCode: 'UNRESOLVED',
                  },
                ]
              : [],
          )
        : [],
    );

    return {
      installedPacks: entries,
      activeVersions,
      pendingUpgrades,
      suspendedPacks,
      supersededPacks,
      unresolvedDependencies,
      validationState: entries.flatMap((entry) =>
        entry.versions.map((version) => ({
          servicePackId: entry.id,
          versionId: version.id,
          status: version.manifestValidationStatus,
        })),
      ),
      acceptanceState: entries.flatMap((entry) =>
        entry.versions.map((version) => ({
          servicePackId: entry.id,
          versionId: version.id,
          status: version.status,
        })),
      ),
      deploymentState: entries.flatMap((entry) =>
        entry.versions.flatMap((version) =>
          version.activeDeploymentId
            ? [
                {
                  servicePackId: entry.id,
                  deploymentId: version.activeDeploymentId,
                  status: entry.activationState ?? ServicePackDeploymentStatus.DEPLOYMENT_READY,
                },
              ]
            : [],
        ),
      ),
    };
  }

  mapPackToRegistryEntry(pack: PackWithRelations): ServicePackRegistryEntry {
    const versionSummaries = pack.versions.map((version) => {
      const activeDeployment =
        version.deployments.find(
          (deployment) =>
            deployment.status === ServicePackDeploymentStatus.ACTIVE ||
            deployment.status === ServicePackDeploymentStatus.DEPLOYED,
        ) ?? version.deployments[0];

      const superseded = version.deployments.some(
        (deployment) => deployment.status === ServicePackDeploymentStatus.SUPERSEDED,
      );

      const serviceCount = version.components.filter(
        (component) => component.componentKind === ServicePackComponentKind.SERVICE,
      ).length;

      const unresolvedDependencyCount = version.dependencies.filter(
        (dependency) => !dependency.referenceCode && !dependency.referenceId,
      ).length;

      return {
        summary: {
          id: version.id,
          version: version.version,
          status: version.status,
          manifestValidationStatus: version.manifestValidationStatus,
          fingerprint: version.compilationFingerprint,
          manifestChecksum: version.manifestChecksum,
          acceptedAt: version.acceptedAt?.toISOString() ?? null,
          compiledAt: version.compiledAt.toISOString(),
          serviceCount,
          dependencyCount: version.dependencies.length,
          lastValidationAt: version.validationResults[0]?.validatedAt.toISOString() ?? null,
          superseded,
          activeDeploymentId: activeDeployment?.id ?? null,
        },
        unresolvedDependencyCount,
      };
    });

    const activeVersion =
      versionSummaries.find(
        (entry) =>
          !entry.summary.superseded &&
          (entry.summary.status === ServicePackVersionStatus.ACCEPTED ||
            entry.summary.manifestValidationStatus ===
              ServicePackManifestValidationStatus.VALIDATED),
      ) ?? versionSummaries[0];

    const activeVersionEntity = activeVersion
      ? pack.versions.find((version) => version.id === activeVersion.summary.id)
      : undefined;

    const activeDeployment = activeVersionEntity?.deployments.find(
      (deployment) =>
        deployment.status === ServicePackDeploymentStatus.ACTIVE ||
        deployment.status === ServicePackDeploymentStatus.DEPLOYED,
    );

    const supersededVersionIds = versionSummaries
      .filter((entry) => entry.summary.superseded)
      .map((entry) => entry.summary.id);

    const unresolvedDependencyCount = versionSummaries.reduce(
      (total, entry) => total + entry.unresolvedDependencyCount,
      0,
    );

    const lastReviewAt =
      pack.versions
        .map((version) => version.acceptedAt)
        .filter((value): value is Date => value instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0]
        ?.toISOString() ?? null;

    return {
      id: pack.id,
      code: pack.code,
      name: pack.name,
      description: pack.description,
      jurisdictionId: pack.jurisdictionId,
      institutionId: pack.institutionId,
      departmentCode: pack.departmentCode,
      responsibleOwnerIdentityId: pack.responsibleOwnerIdentityId,
      exportRestriction: pack.exportRestriction,
      templateSourceServicePackId: pack.templateSourceServicePackId,
      versions: versionSummaries.map((entry) => entry.summary),
      activeVersionId: activeVersion?.summary.id ?? null,
      supersededVersionIds,
      deployedEnvironment: activeDeployment?.deploymentReference ?? null,
      deploymentDate: activeDeployment?.deployedAt?.toISOString() ?? null,
      activationState: activeDeployment?.status ?? null,
      acceptanceState: activeVersion?.summary.status ?? null,
      validationState: activeVersion?.summary.manifestValidationStatus ?? null,
      unresolvedDependencyCount,
      lastReviewAt,
    };
  }
}
