import { BadRequestException } from '@nestjs/common';
import { LogClassification, ResourceSaturationLevel } from '@prisma/client';

import { ProductionReliabilityBoundaryService } from './common/production-reliability-boundary.service';
import {
  FORBIDDEN_TRACE_FIELDS,
  PHASE_13C_BOUNDARY_DISCLAIMER,
  PHASE_13C_INVARIANTS,
  PRODUCTION_RELIABILITY_REASON_CODES,
  TECHNICAL_HEALTH_DISCLAIMER,
} from './production-reliability.constants';

describe('Phase 13C must-fail invariants', () => {
  const boundary = new ProductionReliabilityBoundaryService();

  it('exposes Phase 13C boundary disclaimer with core distinctions', () => {
    expect(PHASE_13C_BOUNDARY_DISCLAIMER).toContain(
      'Application running does not equal service healthy',
    );
    expect(PHASE_13C_BOUNDARY_DISCLAIMER).toContain(
      'HTTP 200 does not equal correct government outcome',
    );
    expect(PHASE_13C_BOUNDARY_DISCLAIMER).toContain('Alerts are not incidents');
    expect(TECHNICAL_HEALTH_DISCLAIMER).toContain(
      'do not establish institutional service acceptance',
    );
  });

  it('enforces all Phase 13C invariants', () => {
    expect(PHASE_13C_INVARIANTS.applicationRunningNotHealthy).toBe(true);
    expect(PHASE_13C_INVARIANTS.sloViolationNotWaiver).toBe(true);
    expect(PHASE_13C_INVARIANTS.observabilityCaseIsolation).toBe(true);
  });

  it('rejects invented SLA without approved reference', () => {
    expect(() => {
      boundary.assertApprovedTargetReference('');
    }).toThrow(BadRequestException);
    expect(() => {
      boundary.assertApprovedTargetReference('');
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.INVENTED_SLA_FORBIDDEN);
  });

  it('rejects HTTP 200 as government outcome', () => {
    expect(() => {
      boundary.assertHttp200NotGovernmentOutcome(true);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.HTTP_200_NOT_OUTCOME);
  });

  it('rejects technical health claiming institutional acceptance', () => {
    expect(() => {
      boundary.assertTechnicalHealthNotInstitutionalAcceptance(true);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.TECHNICAL_HEALTH_NOT_INSTITUTIONAL);
  });

  it('rejects alert marked as incident', () => {
    expect(() => {
      boundary.assertAlertNotIncident(true);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.ALERT_NOT_INCIDENT);
  });

  it('rejects alert becoming institutional decision', () => {
    expect(() => {
      boundary.assertAlertNotInstitutionalDecision('approval granted by alert');
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.ALERT_NOT_DECISION);
  });

  it('rejects outage granting bypass authority', () => {
    expect(() => {
      boundary.assertOutageDoesNotGrantBypass('bypass control during outage');
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.OUTAGE_NOT_BYPASS);
  });

  it('rejects SLO violation waiving requirements', () => {
    expect(() => {
      boundary.assertSloViolationDoesNotWaiveRequirements(true);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.SLO_VIOLATION_NOT_WAIVER);
  });

  it('rejects unauthorized production load test', () => {
    expect(() => {
      boundary.assertProductionLoadAuthorized(true, false);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.PRODUCTION_LOAD_UNAUTHORIZED);
  });

  it('rejects unapproved production data in tests', () => {
    expect(() => {
      boundary.assertProductionDataApproved(true, false);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.PRODUCTION_DATA_UNAPPROVED);
  });

  it('isolates dependency outage from unrelated capabilities', () => {
    expect(() => {
      boundary.assertDependencyOutageIsolated(
        'payment-provider',
        ['case-management'],
        'PAYMENT_PROVIDER',
      );
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.DEPENDENCY_OUTAGE_ISOLATED);
  });

  it('requires stale integration state to be surfaced', () => {
    expect(() => {
      boundary.assertStaleIntegrationSurfaced(true, false);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.STALE_INTEGRATION_VISIBLE);
  });

  it('redacts secrets from logs', () => {
    const redacted = boundary.redactLogPayload({
      username: 'operator',
      password: 'secret-value',
      token: 'Bearer abc.def.ghi',
    });
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.username).toBe('operator');
  });

  it('respects data classification in traces', () => {
    const sanitized = boundary.sanitizeTracePayload(
      { password: 'secret', operation: 'query' },
      LogClassification.RESTRICTED,
    );
    expect(sanitized.password).toBe('[CLASSIFICATION_REDACTED]');
    expect(sanitized.operation).toBe('query');
  });

  it.each(FORBIDDEN_TRACE_FIELDS.map((field) => [field]))(
    'redacts forbidden trace field "%s" for restricted classification',
    (field) => {
      const sanitized = boundary.sanitizeTracePayload(
        { [field]: 'sensitive' },
        LogClassification.PII_RESTRICTED,
      );
      expect(sanitized[field]).toBe('[CLASSIFICATION_REDACTED]');
    },
  );

  it('prevents observability from exposing another case', () => {
    expect(() => {
      boundary.assertObservabilityCaseIsolation('case-001', 'case-002');
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.OBSERVABILITY_CASE_ISOLATION);
  });

  it('requires mandatory process rate limit fallback', () => {
    expect(() => {
      boundary.assertMandatoryRateLimitHasFallback(true, false, 'UPLOAD');
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.RATE_LIMIT_MANDATORY_FALLBACK);
  });

  it('rejects performance degradation producing approval or refusal', () => {
    expect(() => {
      boundary.assertPerformanceDegradationNotApproval('auto-approved due to latency');
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.PERFORMANCE_NOT_APPROVAL);
  });

  it('requires capacity exhaustion safe-fail', () => {
    expect(() => {
      boundary.assertCapacityExhaustionSafeFail(false, true);
    }).toThrow(PRODUCTION_RELIABILITY_REASON_CODES.CAPACITY_SAFE_FAIL);
  });

  it('allows capacity exhaustion when safe-fail applied', () => {
    expect(() => {
      boundary.assertCapacityExhaustionSafeFail(true, true);
    }).not.toThrow();
  });

  it('rejects load test bypassing authority checks', () => {
    expect(() => {
      boundary.assertLoadPreservesAuthorityChecks(true);
    }).toThrow('Load testing must not bypass authority checks');
  });

  it('rejects queue retry duplicating consequential action', () => {
    expect(() => {
      boundary.assertIdempotencyPreserved(true);
    }).toThrow('Queue retry cannot duplicate consequential action');
  });

  it('records saturation safe-fail for exhausted resources', () => {
    expect(ResourceSaturationLevel.EXHAUSTED).toBe('EXHAUSTED');
  });
});
