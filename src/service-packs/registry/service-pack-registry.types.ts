import {
  type ServicePackDeploymentStatus,
  type ServicePackManifestValidationStatus,
  type ServicePackVersionStatus,
} from '@prisma/client';

export interface ServicePackRegistryVersionSummary {
  id: string;
  version: string;
  status: ServicePackVersionStatus;
  manifestValidationStatus: ServicePackManifestValidationStatus;
  fingerprint: string;
  manifestChecksum: string | null;
  acceptedAt: string | null;
  compiledAt: string;
  serviceCount: number;
  dependencyCount: number;
  lastValidationAt: string | null;
  superseded: boolean;
  activeDeploymentId: string | null;
}

export interface ServicePackRegistryEntry {
  id: string;
  code: string;
  name: string;
  description: string | null;
  jurisdictionId: string | null;
  institutionId: string;
  departmentCode: string | null;
  responsibleOwnerIdentityId: string | null;
  exportRestriction: string;
  templateSourceServicePackId: string | null;
  versions: ServicePackRegistryVersionSummary[];
  activeVersionId: string | null;
  supersededVersionIds: string[];
  deployedEnvironment: string | null;
  deploymentDate: string | null;
  activationState: ServicePackDeploymentStatus | null;
  acceptanceState: ServicePackVersionStatus | null;
  validationState: ServicePackManifestValidationStatus | null;
  unresolvedDependencyCount: number;
  lastReviewAt: string | null;
}

export interface ServicePackRegistryInventorySnapshot {
  installedPacks: ServicePackRegistryEntry[];
  activeVersions: { servicePackId: string; versionId: string; version: string }[];
  pendingUpgrades: {
    servicePackId: string;
    currentVersionId: string;
    candidateVersionId: string;
  }[];
  suspendedPacks: { servicePackId: string; deploymentId: string }[];
  supersededPacks: { servicePackId: string; versionId: string; deploymentId: string }[];
  unresolvedDependencies: { servicePackId: string; versionId: string; dependencyCode: string }[];
  validationState: {
    servicePackId: string;
    versionId: string;
    status: ServicePackManifestValidationStatus;
  }[];
  acceptanceState: { servicePackId: string; versionId: string; status: ServicePackVersionStatus }[];
  deploymentState: {
    servicePackId: string;
    deploymentId: string;
    status: ServicePackDeploymentStatus;
  }[];
}
