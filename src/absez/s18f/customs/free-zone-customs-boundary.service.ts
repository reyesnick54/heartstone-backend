import { ForbiddenException, Injectable } from '@nestjs/common';

import { S18F_BOUNDARY_DISCLAIMERS } from '../absez-s18f.constants';

const FORBIDDEN_SPOOFED_CUSTOMS_FIELDS = [
  'isAuthenticated',
  'authenticatedPayloadHash',
  'retainedNationalDeterminationId',
  'spoofedAbsezClearanceAttempt',
] as const;

@Injectable()
export class FreeZoneCustomsBoundaryService {
  rejectApplicantForgedNationalCustomsDetermination(
    payload: Record<string, unknown>,
    actorIsOfficial: boolean,
  ): void {
    if (actorIsOfficial) {
      return;
    }
    for (const field of FORBIDDEN_SPOOFED_CUSTOMS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${S18F_BOUNDARY_DISCLAIMERS.customsCoordinationNotClearance}: forbidden field ${field}`,
        );
      }
    }
  }

  assertDoesNotManufactureClearance(doesNotImplyCustomsClearance: boolean): void {
    if (!doesNotImplyCustomsClearance) {
      throw new ForbiddenException(S18F_BOUNDARY_DISCLAIMERS.customsCoordinationNotClearance);
    }
  }
}
