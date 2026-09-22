import { ForbiddenException, Injectable } from '@nestjs/common';

import { FORBIDDEN_MEDICAL_DETAIL_FIELDS } from '../transportation.constants';

@Injectable()
export class TransportationExperienceBoundaryService {
  readonly disclaimer =
    'Transportation experience projections are informational only. They do not issue licenses, change registration, or expose protected medical determinations.';

  sanitizeCitizenPayload<T extends Record<string, unknown>>(payload: T): T {
    const clone = { ...payload } as Record<string, unknown>;
    for (const field of FORBIDDEN_MEDICAL_DETAIL_FIELDS) {
      Reflect.deleteProperty(clone, field);
    }
    return clone as T;
  }

  assertCitizenCannotIssueLicense(actionKey: string): void {
    const forbidden = ['issue_driver_license', 'approve_vehicle_registration', 'override_decision'];
    if (forbidden.includes(actionKey)) {
      throw new ForbiddenException(
        'Citizens cannot issue driver licenses or approve vehicle registrations',
      );
    }
  }
}
