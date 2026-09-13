import { BadRequestException, Injectable } from '@nestjs/common';

import {
  FORBIDDEN_CLIENT_COMPLIANCE_STATUS_FIELDS,
  HOLDER_DASHBOARD_RESTRICTED_FIELDS,
} from './compliance-status.constants';

@Injectable()
export class ComplianceStatusBoundaryService {
  assertClientCannotSetComplianceStatus(payload: Record<string, unknown>) {
    for (const field of FORBIDDEN_CLIENT_COMPLIANCE_STATUS_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(
          `Clients cannot set compliance projection field "${field}"; status is derived from authoritative records`,
        );
      }
    }
  }

  sanitizeHolderDashboardResponse<T extends Record<string, unknown>>(payload: T): T {
    const restricted = new Set<string>(HOLDER_DASHBOARD_RESTRICTED_FIELDS);
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) => !restricted.has(key)),
    ) as T;
  }

  assertAlertIsNotViolation(alert: { isViolation: boolean; isEnforcementDecision: boolean }) {
    if (alert.isViolation || alert.isEnforcementDecision) {
      throw new BadRequestException(
        'Compliance alerts cannot be recorded as violations or enforcement decisions',
      );
    }
  }
}
