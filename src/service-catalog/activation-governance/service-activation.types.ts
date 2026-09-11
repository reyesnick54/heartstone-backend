import {
  type GovernmentServiceMaturityStatus,
  type GovernmentServicePublicAvailability,
  type ServiceActivationOutcome,
} from '@prisma/client';

export interface ServiceActivationActor {
  identityId: string;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
}

export interface ServiceActivationRequest {
  governmentServiceVersionId: string;
  actor: ServiceActivationActor;
  reason?: string;
  effectiveAt?: Date;
  scopeLimitations?: string[];
  pilotScopeDescription?: string;
}

export interface ServiceSuspensionRequest {
  governmentServiceVersionId: string;
  actor: ServiceActivationActor;
  reason: string;
  effectiveAt?: Date;
}

export interface ServiceSupersessionRequest {
  priorGovernmentServiceVersionId: string;
  newGovernmentServiceVersionId: string;
  actor: ServiceActivationActor;
  reason?: string;
  effectiveAt?: Date;
}

export interface ServiceActivationResult {
  outcome: ServiceActivationOutcome;
  governmentServiceVersionId: string;
  priorMaturityStatus: GovernmentServiceMaturityStatus;
  newMaturityStatus: GovernmentServiceMaturityStatus;
  priorPublicAvailability: GovernmentServicePublicAvailability;
  newPublicAvailability: GovernmentServicePublicAvailability;
  activationRecordId?: string;
  authorityEvaluationRecordId?: string;
  message: string;
}
