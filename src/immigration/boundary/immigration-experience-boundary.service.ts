import { ForbiddenException, Injectable } from '@nestjs/common';

import {
  IMMIGRATION_EXTERNAL_RESTRICTED_DEPENDENCY_TYPES,
  IMMIGRATION_RESTRICTED_CITIZEN_FIELDS,
} from '../immigration.constants';

@Injectable()
export class ImmigrationExperienceBoundaryService {
  readonly disclaimer =
    'Immigration experience projections are informational only. They do not change legal immigration status, confer rights, or expose classified external checks.';

  sanitizeCitizenPayload<T extends Record<string, unknown>>(payload: T): T {
    const clone = { ...payload } as Record<string, unknown>;
    for (const field of IMMIGRATION_RESTRICTED_CITIZEN_FIELDS) {
      Reflect.deleteProperty(clone, field);
    }
    if (Array.isArray(clone.externalChecks)) {
      clone.externalChecks = (clone.externalChecks as Record<string, unknown>[]).map((check) =>
        this.sanitizeExternalCheckForCitizen(check),
      );
    }
    return clone as T;
  }

  sanitizeExternalCheckForCitizen(check: Record<string, unknown>): Record<string, unknown> {
    const dependencyType = typeof check.dependencyType === 'string' ? check.dependencyType : '';
    if (
      IMMIGRATION_EXTERNAL_RESTRICTED_DEPENDENCY_TYPES.some((type) => dependencyType.includes(type))
    ) {
      return {
        dependencyType: 'EXTERNAL_COORDINATION',
        status: check.publicStatusLabel ?? 'Pending external coordination',
        disclaimer:
          'Detailed external check results are not disclosed through the citizen experience.',
      };
    }
    return {
      dependencyType: check.dependencyType,
      status: check.publicStatusLabel ?? check.status,
      completedAt: check.completedAt,
    };
  }

  assertCitizenCannotMutateImmigrationStatus(actionKey: string): void {
    const forbidden = [
      'set_immigration_status',
      'self_issue_residence_permit',
      'override_decision',
      'approve_application',
    ];
    if (forbidden.includes(actionKey)) {
      throw new ForbiddenException(
        'Citizens cannot change immigration status or issue government credentials',
      );
    }
  }

  assertApplicantCannotSelfIssue(isApplicantActor: boolean, actionKey: string): void {
    if (isApplicantActor && actionKey === 'issue_credential') {
      throw new ForbiddenException(
        'Applicants cannot self-issue immigration credentials; issuance requires governed authority',
      );
    }
  }
}
