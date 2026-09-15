import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CapabilityDependencyControlScope,
  CapabilityMaturityState,
  ProductionReadinessStatus,
} from '@prisma/client';

import {
  AI_ACTOR_IDENTITY_PREFIX,
  AI_ACTOR_ROLE_MARKER,
  FORBIDDEN_AI_MATURITY_ACTIONS,
  FORBIDDEN_CLIENT_DEPENDENCY_FIELDS,
  FORBIDDEN_CLIENT_MATURITY_FIELDS,
  FORBIDDEN_CLIENT_READINESS_FIELDS,
  INSTITUTIONAL_ACCEPTANCE_EVIDENCE_TYPES,
  OPERATIONAL_READINESS_REASON_CODES,
  PILOT_SUCCESS_EVIDENCE_TYPES,
  TECHNICAL_COMPLETION_EVIDENCE_TYPES,
  VENDOR_CERTIFICATION_EVIDENCE_TYPES,
} from '../operational-readiness.constants';

export interface MaturityAdvancementContext {
  currentMaturity: CapabilityMaturityState;
  requestedMaturity: CapabilityMaturityState;
  evidenceTypes: string[];
  actorRoleMarker?: string;
  actorIdentityId?: string;
  isTechnicalAdministrator?: boolean;
  acceptsInstitutionalRisk?: boolean;
  productionReadinessStatus?: ProductionReadinessStatus;
  hasUnresolvedCriticalConditions?: boolean;
  mandatoryActivationConditionsSatisfied?: boolean;
  isSuspended?: boolean;
  isRetired?: boolean;
  hasReplacementCapability?: boolean;
}

export interface DependencyReadinessInput {
  controlScope: CapabilityDependencyControlScope;
  isReady: boolean;
  verificationStatus: string;
}

@Injectable()
export class OperationalReadinessBoundaryService {
  rejectClientProtectedMaturityFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_MATURITY_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set "${field}"; maturity is advanced only through governed assessment pathways`,
        );
      }
    }
  }

  rejectClientProtectedReadinessFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_READINESS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set "${field}"; production readiness status is derived from authoritative assessments`,
        );
      }
    }
  }

  rejectClientProtectedDependencyFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_DEPENDENCY_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set "${field}"; dependency readiness must be verified through governed pathways`,
        );
      }
    }
  }

  assertAiCannotAdvanceMaturity(action: string, actorRoleMarker?: string): void {
    if (!FORBIDDEN_AI_MATURITY_ACTIONS.includes(action as (typeof FORBIDDEN_AI_MATURITY_ACTIONS)[number])) {
      return;
    }

    if (actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(OPERATIONAL_READINESS_REASON_CODES.AI_CANNOT_ADVANCE_MATURITY);
    }
  }

  assertAiActorCannotAct(actorRoleMarker?: string, actorIdentityId?: string): void {
    if (
      actorRoleMarker === AI_ACTOR_ROLE_MARKER ||
      (actorIdentityId?.startsWith(AI_ACTOR_IDENTITY_PREFIX) ?? false)
    ) {
      throw new ForbiddenException(OPERATIONAL_READINESS_REASON_CODES.AI_CANNOT_ADVANCE_MATURITY);
    }
  }

  assertTechnicalCompletionCannotAuthorizeProduction(evidenceTypes: string[]): void {
    const onlyTechnical = evidenceTypes.every((type) =>
      (TECHNICAL_COMPLETION_EVIDENCE_TYPES as readonly string[]).includes(type),
    );

    if (onlyTechnical && evidenceTypes.length > 0) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.TECHNICAL_COMPLETION_NOT_PRODUCTION_READY,
      );
    }
  }

  assertCiSuccessNotInstitutionalAcceptance(evidenceTypes: string[]): void {
    const hasCiOnly =
      evidenceTypes.includes('CI_PIPELINE_SUCCESS') &&
      !evidenceTypes.some((type) =>
        (INSTITUTIONAL_ACCEPTANCE_EVIDENCE_TYPES as readonly string[]).includes(type),
      );

    if (hasCiOnly) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.CI_SUCCESS_NOT_INSTITUTIONAL_ACCEPTANCE,
      );
    }
  }

  assertVendorCertificationNotInstitutionalAcceptance(evidenceTypes: string[]): void {
    const hasVendorOnly =
      evidenceTypes.some((type) =>
        (VENDOR_CERTIFICATION_EVIDENCE_TYPES as readonly string[]).includes(type),
      ) &&
      !evidenceTypes.some((type) =>
        (INSTITUTIONAL_ACCEPTANCE_EVIDENCE_TYPES as readonly string[]).includes(type),
      );

    if (hasVendorOnly) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.VENDOR_CERT_NOT_INSTITUTIONAL_ACCEPTANCE,
      );
    }
  }

  assertPilotSuccessCannotAuthorizeProduction(
    requestedMaturity: CapabilityMaturityState,
    evidenceTypes: string[],
  ): void {
    const hasPilotOnly =
      evidenceTypes.some((type) => (PILOT_SUCCESS_EVIDENCE_TYPES as readonly string[]).includes(type)) &&
      !evidenceTypes.some((type) => type === 'PRODUCTION_READINESS_ASSESSMENT');

    if (
      hasPilotOnly &&
      (requestedMaturity === CapabilityMaturityState.PRODUCTION_READY ||
        requestedMaturity === CapabilityMaturityState.INSTITUTIONALLY_ACCEPTED)
    ) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.PILOT_SUCCESS_NOT_PRODUCTION_AUTHORIZATION,
      );
    }
  }

  assertProductionReadinessCannotSetInstitutionalAcceptance(
    requestedMaturity: CapabilityMaturityState,
    evidenceTypes: string[],
  ): void {
    if (requestedMaturity !== CapabilityMaturityState.INSTITUTIONALLY_ACCEPTED) {
      return;
    }

    const hasInstitutionalEvidence = evidenceTypes.some((type) =>
      (INSTITUTIONAL_ACCEPTANCE_EVIDENCE_TYPES as readonly string[]).includes(type),
    );

    if (!hasInstitutionalEvidence) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.PRODUCTION_READINESS_NOT_INSTITUTIONAL_ACCEPTANCE,
      );
    }
  }

  assertInstitutionalAcceptanceCannotAutoActivate(
    requestedMaturity: CapabilityMaturityState,
    mandatoryActivationConditionsSatisfied?: boolean,
  ): void {
    if (requestedMaturity !== CapabilityMaturityState.OPERATIONALLY_ACTIVATED) {
      return;
    }

    if (!mandatoryActivationConditionsSatisfied) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.INSTITUTIONAL_ACCEPTANCE_NOT_OPERATIONAL_ACTIVATION,
      );
    }
  }

  assertTechnicalAdminCannotAcceptInstitutionalRisk(
    isTechnicalAdministrator: boolean,
    acceptsInstitutionalRisk: boolean,
  ): void {
    if (isTechnicalAdministrator && acceptsInstitutionalRisk) {
      throw new ForbiddenException(
        OPERATIONAL_READINESS_REASON_CODES.TECH_ADMIN_CANNOT_ACCEPT_INSTITUTIONAL_RISK,
      );
    }
  }

  assertExternalDependencyNotFalselyControlled(input: DependencyReadinessInput): void {
    if (
      input.controlScope === CapabilityDependencyControlScope.EXTERNAL &&
      input.isReady &&
      input.verificationStatus !== 'VERIFIED'
    ) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED,
      );
    }
  }

  assertUnresolvedCriticalConditionsBlock(hasUnresolvedCriticalConditions: boolean): void {
    if (hasUnresolvedCriticalConditions) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.UNRESOLVED_CRITICAL_CONDITION);
    }
  }

  assertSuspendedCannotAppearOperational(isSuspended: boolean, requestedMaturity: CapabilityMaturityState): void {
    if (
      isSuspended &&
      (requestedMaturity === CapabilityMaturityState.OPERATIONALLY_ACTIVATED ||
        requestedMaturity === CapabilityMaturityState.INSTITUTIONALLY_ACCEPTED)
    ) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.SUSPENDED_CANNOT_APPEAR_OPERATIONAL);
    }
  }

  assertRetiredCannotReactivateWithoutReplacement(
    isRetired: boolean,
    requestedMaturity: CapabilityMaturityState,
    hasReplacementCapability: boolean,
  ): void {
    if (
      isRetired &&
      requestedMaturity !== CapabilityMaturityState.REPLACED &&
      requestedMaturity !== CapabilityMaturityState.RETIRED &&
      !hasReplacementCapability
    ) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.RETIRED_CANNOT_REACTIVATE);
    }
  }

  assertReadyWithConditionsHasMeasurableConditions(
    status: ProductionReadinessStatus,
    measurableConditions: string[],
  ): void {
    if (status === ProductionReadinessStatus.READY_WITH_CONDITIONS && measurableConditions.length === 0) {
      throw new BadRequestException(
        OPERATIONAL_READINESS_REASON_CODES.READY_WITH_CONDITIONS_REQUIRES_MEASURABLE,
      );
    }
  }

  assertEvidenceRequiredForAdvancement(evidenceCount: number): void {
    if (evidenceCount === 0) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.EVIDENCE_REQUIRED_FOR_ADVANCEMENT);
    }
  }

  assertNoProductionActivationEndpoint(path: string): void {
    if (path.includes('activate-production') || path === '/activate-production') {
      throw new ForbiddenException(OPERATIONAL_READINESS_REASON_CODES.ACTIVATION_NOT_PRODUCTION);
    }
  }

  validateMaturityAdvancement(context: MaturityAdvancementContext): void {
    this.assertAiActorCannotAct(context.actorRoleMarker, context.actorIdentityId);
    this.assertSuspendedCannotAppearOperational(context.isSuspended ?? false, context.requestedMaturity);
    this.assertRetiredCannotReactivateWithoutReplacement(
      context.isRetired ?? false,
      context.requestedMaturity,
      context.hasReplacementCapability ?? false,
    );
    this.assertUnresolvedCriticalConditionsBlock(context.hasUnresolvedCriticalConditions ?? false);
    this.assertTechnicalAdminCannotAcceptInstitutionalRisk(
      context.isTechnicalAdministrator ?? false,
      context.acceptsInstitutionalRisk ?? false,
    );
    this.assertTechnicalCompletionCannotAuthorizeProduction(context.evidenceTypes);
    this.assertPilotSuccessCannotAuthorizeProduction(context.requestedMaturity, context.evidenceTypes);
    this.assertProductionReadinessCannotSetInstitutionalAcceptance(
      context.requestedMaturity,
      context.evidenceTypes,
    );
    this.assertInstitutionalAcceptanceCannotAutoActivate(
      context.requestedMaturity,
      context.mandatoryActivationConditionsSatisfied,
    );
    this.assertCiSuccessNotInstitutionalAcceptance(context.evidenceTypes);
    this.assertVendorCertificationNotInstitutionalAcceptance(context.evidenceTypes);
  }
}
