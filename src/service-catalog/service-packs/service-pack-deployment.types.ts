import {
  type ServicePackDeploymentAuditEventType,
  type ServicePackDeploymentBindingDomain,
  type ServicePackDeploymentStatus,
  type ServicePackVersionStatus,
} from '@prisma/client';

export interface ServicePackDeploymentActor {
  identityId: string;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
}

export interface ServicePackManifestEntry {
  domain: ServicePackDeploymentBindingDomain;
  entityId: string;
  entityVersion?: string;
  snapshot?: Record<string, unknown>;
}

export interface ServicePackManifest {
  servicePackVersionId: string;
  servicePackVersionLabel: string;
  compilationFingerprint: string;
  entries: ServicePackManifestEntry[];
}

export interface ServicePackAcceptVersionRequest {
  servicePackVersionId: string;
  actor: ServicePackDeploymentActor;
  reason?: string;
}

export interface ServicePackCreateDeploymentRequest {
  servicePackVersionId: string;
  deploymentReference: string;
  actor: ServicePackDeploymentActor;
  reason?: string;
}

export interface ServicePackDeployRequest {
  deploymentId: string;
  actor: ServicePackDeploymentActor;
  reason?: string;
}

export interface ServicePackActivationRequest {
  deploymentId: string;
  actor: ServicePackDeploymentActor;
  reason?: string;
  effectiveAt?: Date;
}

export interface ServicePackRollbackRequest {
  deploymentId: string;
  actor: ServicePackDeploymentActor;
  reason: string;
}

export interface ServicePackSupersessionRequest {
  priorDeploymentId: string;
  newDeploymentId: string;
  actor: ServicePackDeploymentActor;
  reason?: string;
}

export interface ServicePackDeploymentResult {
  deploymentId: string;
  servicePackVersionId: string;
  priorStatus: ServicePackDeploymentStatus | null;
  newStatus: ServicePackDeploymentStatus;
  configurationFingerprint?: string;
  message: string;
}

export interface ServicePackVersionResult {
  servicePackVersionId: string;
  priorStatus: ServicePackVersionStatus;
  newStatus: ServicePackVersionStatus;
  message: string;
}

export interface ServicePackActivationResult {
  deploymentId: string;
  outcome: 'ACTIVATED' | 'BLOCKED' | 'REQUIRES_READINESS' | 'REQUIRES_CONFIGURATION' | 'DENIED';
  priorStatus: ServicePackDeploymentStatus;
  newStatus: ServicePackDeploymentStatus;
  activatedServiceVersionIds: string[];
  blockedReasons: string[];
  activationRecordIds: string[];
  message: string;
}

export interface ServicePackRollbackResult {
  deploymentId: string;
  priorStatus: ServicePackDeploymentStatus;
  newStatus: ServicePackDeploymentStatus;
  reversedBindingIds: string[];
  preservedBindingIds: string[];
  message: string;
}

export interface ServicePackDeploymentAuditEventInput {
  deploymentId: string;
  eventType: ServicePackDeploymentAuditEventType;
  actorIdentityId: string;
  priorStatus?: ServicePackDeploymentStatus | null;
  newStatus?: ServicePackDeploymentStatus | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}
