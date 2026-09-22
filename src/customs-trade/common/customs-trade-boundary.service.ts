import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import {
  CUSTOMS_REASON_CODES,
  CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS,
  type CustomsReleaseConditionKey,
  FORBIDDEN_AI_CUSTOMS_ACTIONS,
} from '../customs-trade.constants';
import {
  FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS,
  FORBIDDEN_CUSTOMS_DECLARATION_CLIENT_FIELDS,
  FORBIDDEN_CUSTOMS_RELEASE_CLIENT_FIELDS,
} from '../customs-trade-schema.constants';

@Injectable()
export class CustomsTradeBoundaryService {
  rejectClientDeclarationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CUSTOMS_DECLARATION_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${CUSTOMS_REASON_CODES.DECLARATION_DOES_NOT_RELEASE}: ${field}`,
        );
      }
    }
  }

  rejectClientReleaseFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CUSTOMS_RELEASE_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${CUSTOMS_REASON_CODES.RELEASE_CONDITIONS_NOT_MET}: ${field}`,
        );
      }
    }
  }

  rejectClientAssessmentFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`${CUSTOMS_REASON_CODES.PAYMENT_DOES_NOT_RELEASE}: ${field}`);
      }
    }
  }

  assertSubmittedDeclarationVersionImmutable(lockedAt: Date | null | undefined): void {
    if (lockedAt) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.SUBMITTED_DECLARATION_IMMUTABLE);
    }
  }

  assertDeclarationSubmissionDoesNotRelease(context?: string): void {
    if (context?.toLowerCase().includes('cargo released')) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.DECLARATION_DOES_NOT_RELEASE);
    }
  }

  assertPaymentDoesNotRelease(context?: string): void {
    if (context?.toLowerCase().includes('cargo released')) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.PAYMENT_DOES_NOT_RELEASE);
    }
  }

  assertAiCannotExecuteRelease(actorIdentityType: IdentityType): void {
    if (actorIdentityType === IdentityType.SERVICE) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE);
    }
  }

  assertAiCustomsActionForbidden(action: string): void {
    if (
      FORBIDDEN_AI_CUSTOMS_ACTIONS.includes(action as (typeof FORBIDDEN_AI_CUSTOMS_ACTIONS)[number])
    ) {
      throw new ForbiddenException(`${CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE}: ${action}`);
    }
  }

  assertReleaseAuthoritativeConditions(
    conditions: Partial<Record<CustomsReleaseConditionKey, boolean>>,
  ): void {
    for (const key of CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS) {
      if (conditions[key] !== true) {
        throw new BadRequestException(`${CUSTOMS_REASON_CODES.RELEASE_CONDITIONS_NOT_MET}: ${key}`);
      }
    }
  }
}
