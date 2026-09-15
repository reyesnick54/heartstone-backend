import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { LogClassification } from '@prisma/client';

import { redactSensitiveObject } from '../../common/logging/log-redaction';
import {
  FORBIDDEN_OBSERVABILITY_CASE_FIELDS,
  FORBIDDEN_TRACE_FIELDS,
  PRODUCTION_RELIABILITY_REASON_CODES,
} from '../production-reliability.constants';

@Injectable()
export class ProductionReliabilityBoundaryService {
  assertApprovedTargetReference(reference: string): void {
    if (!reference || reference.trim().length === 0) {
      throw new BadRequestException(
        `${PRODUCTION_RELIABILITY_REASON_CODES.INVENTED_SLA_FORBIDDEN}: service targets must reference approved configured values`,
      );
    }
  }

  assertNotInventedSla(targetValue: string, approvedReference: string): void {
    if (!approvedReference || approvedReference.trim().length === 0) {
      throw new BadRequestException(PRODUCTION_RELIABILITY_REASON_CODES.INVENTED_SLA_FORBIDDEN);
    }
    if (
      targetValue.toLowerCase().includes('guaranteed') &&
      !approvedReference.includes('APPROVED')
    ) {
      throw new BadRequestException(PRODUCTION_RELIABILITY_REASON_CODES.INVENTED_SLA_FORBIDDEN);
    }
  }

  assertHttp200NotGovernmentOutcome(measuredAsOutcome: boolean): void {
    if (measuredAsOutcome) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.HTTP_200_NOT_OUTCOME);
    }
  }

  assertTechnicalHealthNotInstitutionalAcceptance(claimsInstitutionalAcceptance: boolean): void {
    if (claimsInstitutionalAcceptance) {
      throw new ForbiddenException(
        PRODUCTION_RELIABILITY_REASON_CODES.TECHNICAL_HEALTH_NOT_INSTITUTIONAL,
      );
    }
  }

  assertAlertNotIncident(markedAsIncident: boolean): void {
    if (markedAsIncident) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.ALERT_NOT_INCIDENT);
    }
  }

  assertAlertNotInstitutionalDecision(context?: string): void {
    if (
      context?.toLowerCase().includes('approval granted') ||
      context?.toLowerCase().includes('refusal recorded') ||
      context?.toLowerCase().includes('institutional decision')
    ) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.ALERT_NOT_DECISION);
    }
  }

  assertOutageDoesNotGrantBypass(context?: string): void {
    if (
      context?.toLowerCase().includes('bypass control') ||
      context?.toLowerCase().includes('waive requirement')
    ) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.OUTAGE_NOT_BYPASS);
    }
  }

  assertSloViolationDoesNotWaiveRequirements(requirementsWaived: boolean): void {
    if (requirementsWaived) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.SLO_VIOLATION_NOT_WAIVER);
    }
  }

  assertProductionLoadAuthorized(isProductionTarget: boolean, authorized: boolean): void {
    if (isProductionTarget && !authorized) {
      throw new ForbiddenException(
        PRODUCTION_RELIABILITY_REASON_CODES.PRODUCTION_LOAD_UNAUTHORIZED,
      );
    }
  }

  assertProductionDataApproved(usesProductionData: boolean, approved: boolean): void {
    if (usesProductionData && !approved) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.PRODUCTION_DATA_UNAPPROVED);
    }
  }

  assertDependencyOutageIsolated(
    failedDependency: string,
    unrelatedCapabilityMarkedUnusable: string[],
    failedDependencyType: string,
  ): void {
    const unrelated = unrelatedCapabilityMarkedUnusable.filter(
      (cap) => !cap.toLowerCase().includes(failedDependencyType.toLowerCase()),
    );
    if (unrelated.length > 0) {
      throw new ForbiddenException(
        `${PRODUCTION_RELIABILITY_REASON_CODES.DEPENDENCY_OUTAGE_ISOLATED}: outage on ${failedDependency} must not mark unrelated capabilities unusable`,
      );
    }
  }

  assertStaleIntegrationSurfaced(isStale: boolean, surfaced: boolean): void {
    if (isStale && !surfaced) {
      throw new BadRequestException(PRODUCTION_RELIABILITY_REASON_CODES.STALE_INTEGRATION_VISIBLE);
    }
  }

  redactLogPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return redactSensitiveObject(payload);
  }

  sanitizeTracePayload(
    payload: Record<string, unknown>,
    classification: LogClassification,
  ): Record<string, unknown> {
    const redacted = redactSensitiveObject(payload);

    if (
      classification === LogClassification.RESTRICTED ||
      classification === LogClassification.PII_RESTRICTED ||
      classification === LogClassification.SECURITY_SENSITIVE
    ) {
      for (const field of FORBIDDEN_TRACE_FIELDS) {
        if (field in redacted) {
          redacted[field] = '[CLASSIFICATION_REDACTED]';
        }
      }
    }

    return redacted;
  }

  assertObservabilityCaseIsolation(
    requestingCaseRef: string | undefined,
    exposedCaseRef: string | undefined,
  ): void {
    if (requestingCaseRef && exposedCaseRef && requestingCaseRef !== exposedCaseRef) {
      throw new ForbiddenException(
        PRODUCTION_RELIABILITY_REASON_CODES.OBSERVABILITY_CASE_ISOLATION,
      );
    }
  }

  rejectCrossCaseObservabilityFields(
    payload: Record<string, unknown>,
    authorizedCaseRef?: string,
  ): void {
    for (const field of FORBIDDEN_OBSERVABILITY_CASE_FIELDS) {
      const value = payload[field];
      if (typeof value === 'string' && authorizedCaseRef && value !== authorizedCaseRef) {
        throw new ForbiddenException(
          PRODUCTION_RELIABILITY_REASON_CODES.OBSERVABILITY_CASE_ISOLATION,
        );
      }
    }
  }

  assertMandatoryRateLimitHasFallback(
    isMandatoryProcess: boolean,
    hasFallback: boolean,
    scope: string,
  ): void {
    if (isMandatoryProcess && !hasFallback) {
      throw new BadRequestException(
        `${PRODUCTION_RELIABILITY_REASON_CODES.RATE_LIMIT_MANDATORY_FALLBACK}: scope ${scope} affects mandatory process without fallback`,
      );
    }
  }

  assertPerformanceDegradationNotApproval(context?: string): void {
    if (
      context?.toLowerCase().includes('auto-approved') ||
      context?.toLowerCase().includes('auto-refused')
    ) {
      throw new ForbiddenException(PRODUCTION_RELIABILITY_REASON_CODES.PERFORMANCE_NOT_APPROVAL);
    }
  }

  assertCapacityExhaustionSafeFail(safeFailApplied: boolean, exhaustionRisk: boolean): void {
    if (exhaustionRisk && !safeFailApplied) {
      throw new BadRequestException(PRODUCTION_RELIABILITY_REASON_CODES.CAPACITY_SAFE_FAIL);
    }
  }

  assertLoadPreservesAuthorityChecks(bypassedAuthority: boolean): void {
    if (bypassedAuthority) {
      throw new ForbiddenException('Load testing must not bypass authority checks');
    }
  }

  assertIdempotencyPreserved(duplicateConsequentialAction: boolean): void {
    if (duplicateConsequentialAction) {
      throw new ForbiddenException('Queue retry cannot duplicate consequential action');
    }
  }
}
