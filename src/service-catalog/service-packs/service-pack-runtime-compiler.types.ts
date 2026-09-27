import { type ServicePackDeploymentBindingDomain } from '@prisma/client';

import { type ServicePackManifest as AuthoringServicePackManifest } from './service-pack.types';
import { type ServicePackManifestEntry } from './service-pack-deployment.types';

export interface ServicePackRuntimeCompileRequest {
  servicePackVersionId: string;
  compiledByIdentityId?: string;
  forceRecompile?: boolean;
}

export interface ServicePackRuntimeCompileArtifactSummary {
  governmentServiceVersionIds: string[];
  formDefinitionIds: string[];
  workflowDefinitionIds: string[];
  feeDefinitionIds: string[];
  checklistItemIds: string[];
  outputDefinitionIds: string[];
  redressRouteIds: string[];
}

export interface ServicePackRuntimeCompileResult {
  servicePackVersionId: string;
  compilationFingerprint: string;
  configurationFingerprint: string;
  entryCount: number;
  entries: ServicePackManifestEntry[];
  artifacts: ServicePackRuntimeCompileArtifactSummary;
  authoringManifest: AuthoringServicePackManifest;
  message: string;
}

export interface ResolvedCompileScope {
  institutionId: string;
  departmentId: string;
  institutionCode: string;
  departmentCode: string;
}

export interface MaterializedServiceArtifacts {
  serviceVersionId: string;
  serviceVersionLabel: string;
  formDefinitionId: string;
  formVersionId: string;
  workflowDefinitionId: string;
  workflowVersionId: string;
  feeDefinitionIds: string[];
  checklistItemIds: string[];
  outputDefinitionIds: string[];
  redressRouteIds: string[];
  entries: ServicePackManifestEntry[];
}

export interface CompileBindingEntry {
  domain: ServicePackDeploymentBindingDomain;
  entityId: string;
  entityVersion?: string;
  snapshot?: Record<string, unknown>;
}
