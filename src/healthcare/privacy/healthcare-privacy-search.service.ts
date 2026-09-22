import { Injectable } from '@nestjs/common';
import {
  HealthcareAccessAuditEventType,
  HealthcareAccessDecision,
  HealthcareDataAccessPurpose,
  HealthcareDataCategory,
} from '@prisma/client';

import { HIGHLY_RESTRICTED_HEALTH_DATA_CATEGORIES } from '../healthcare.constants';
import { HealthcareAccessAuditService } from './healthcare-access-audit.service';
import {
  HealthcareAccessEvaluationContext,
  HealthcareDataAccessPolicyService,
} from './healthcare-data-access-policy.service';

export interface HealthcareSearchCandidate {
  resourceId: string;
  dataCategory: HealthcareDataCategory;
}

@Injectable()
export class HealthcarePrivacySearchService {
  constructor(
    private readonly policyService: HealthcareDataAccessPolicyService,
    private readonly accessAudit: HealthcareAccessAuditService,
  ) {}

  filterSearchResults(
    context: HealthcareAccessEvaluationContext,
    candidates: HealthcareSearchCandidate[],
  ): HealthcareSearchCandidate[] {
    const allowed: HealthcareSearchCandidate[] = [];

    for (const candidate of candidates) {
      const evaluation = this.policyService.evaluateAccess({
        ...context,
        dataCategory: candidate.dataCategory,
      });

      if (evaluation.decision === HealthcareAccessDecision.ALLOW) {
        allowed.push(candidate);
      }
    }

    void this.accessAudit.record({
      eventType: HealthcareAccessAuditEventType.SEARCH,
      decision: allowed.length > 0 ? HealthcareAccessDecision.ALLOW : HealthcareAccessDecision.DENY,
      actorIdentityId: context.actorIdentityId,
      patientHealthIdentityId: context.patientHealthIdentityId,
      accessPurpose: context.accessPurpose,
      metadata: {
        requestedCount: candidates.length,
        allowedCount: allowed.length,
      },
    });

    return allowed;
  }

  isPurposeCompatibleWithCategory(
    purpose: HealthcareDataAccessPurpose,
    category: HealthcareDataCategory,
  ): boolean {
    if (purpose === HealthcareDataAccessPurpose.CLINICAL_RESEARCH) {
      return (
        category === HealthcareDataCategory.RESEARCH ||
        category === HealthcareDataCategory.GENERAL_HEALTH
      );
    }

    if (purpose === HealthcareDataAccessPurpose.REGULATORY_OVERSIGHT) {
      return !HIGHLY_RESTRICTED_HEALTH_DATA_CATEGORIES.includes(category);
    }

    if (purpose === HealthcareDataAccessPurpose.EMERGENCY_BREAK_GLASS) {
      return true;
    }

    return category !== HealthcareDataCategory.HIGHLY_RESTRICTED;
  }
}
