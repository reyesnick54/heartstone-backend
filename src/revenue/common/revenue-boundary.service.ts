import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType, TaxAssessmentStatus, TaxCalculationSourceKind } from '@prisma/client';

import {
  FORBIDDEN_AI_TAX_ACTIONS,
  PLATFORM_ADMIN_TAX_ROLE_MARKER,
  REVENUE_REASON_CODES,
  TAX_CLEARANCE_REQUIRED_CONDITION_KEYS,
  type TaxClearanceConditionKey,
} from '../revenue.constants';
import {
  FORBIDDEN_TAX_ASSESSMENT_CLIENT_FIELDS,
  FORBIDDEN_TAX_CLEARANCE_CLIENT_FIELDS,
  FORBIDDEN_TAX_LIABILITY_CLIENT_FIELDS,
  FORBIDDEN_TAX_REFUND_CLIENT_FIELDS,
  FORBIDDEN_TAX_RETURN_CLIENT_FIELDS,
} from '../revenue-schema.constants';

@Injectable()
export class RevenueBoundaryService {
  rejectClientTaxReturnFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_TAX_RETURN_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${REVENUE_REASON_CODES.CLIENT_ASSESSMENT_FIELDS_FORBIDDEN}: ${field}`,
        );
      }
    }
  }

  rejectClientTaxAssessmentFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_TAX_ASSESSMENT_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${REVENUE_REASON_CODES.CLIENT_ASSESSMENT_FIELDS_FORBIDDEN}: ${field}`,
        );
      }
    }
  }

  rejectClientTaxLiabilityFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_TAX_LIABILITY_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${REVENUE_REASON_CODES.PLATFORM_ADMIN_LIABILITY_FORBIDDEN}: ${field}`,
        );
      }
    }
  }

  rejectClientTaxRefundFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_TAX_REFUND_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${REVENUE_REASON_CODES.REFUND_REQUEST_NOT_DISBURSEMENT}: ${field}`,
        );
      }
    }
  }

  rejectClientTaxClearanceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_TAX_CLEARANCE_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${REVENUE_REASON_CODES.CLEARANCE_CONDITIONS_NOT_MET}: ${field}`,
        );
      }
    }
  }

  assertSubmittedReturnVersionImmutable(lockedAt: Date | null | undefined): void {
    if (lockedAt) {
      throw new ForbiddenException(REVENUE_REASON_CODES.SUBMITTED_RETURN_IMMUTABLE);
    }
  }

  assertAiCannotIssueAssessment(
    actorIdentityType: IdentityType,
    actorKind: TaxCalculationSourceKind,
  ): void {
    if (
      actorIdentityType === IdentityType.SERVICE ||
      actorKind === TaxCalculationSourceKind.AI_ASSISTANCE
    ) {
      throw new ForbiddenException(REVENUE_REASON_CODES.AI_CANNOT_ISSUE_ASSESSMENT);
    }
  }

  assertAiTaxActionForbidden(action: string): void {
    if (FORBIDDEN_AI_TAX_ACTIONS.includes(action as (typeof FORBIDDEN_AI_TAX_ACTIONS)[number])) {
      throw new ForbiddenException(`${REVENUE_REASON_CODES.AI_CANNOT_ISSUE_ASSESSMENT}: ${action}`);
    }
  }

  assertPlatformAdminCannotAlterLiability(actorRoleMarker?: string): void {
    if (actorRoleMarker === PLATFORM_ADMIN_TAX_ROLE_MARKER) {
      throw new ForbiddenException(REVENUE_REASON_CODES.PLATFORM_ADMIN_LIABILITY_FORBIDDEN);
    }
  }

  assertPaymentDoesNotGrantClearance(context?: string): void {
    if (context?.toLowerCase().includes('clearance granted')) {
      throw new BadRequestException(REVENUE_REASON_CODES.PAYMENT_DOES_NOT_CLEAR);
    }
  }

  assertRefundRequestIsNotDisbursement(statusFieldSupplied: boolean): void {
    if (statusFieldSupplied) {
      throw new BadRequestException(REVENUE_REASON_CODES.REFUND_REQUEST_NOT_DISBURSEMENT);
    }
  }

  assertAuditMatterDoesNotProveViolation(notes?: string): void {
    if (notes?.toLowerCase().includes('violation proven')) {
      throw new BadRequestException(REVENUE_REASON_CODES.AUDIT_NOT_VIOLATION);
    }
  }

  assertAssessmentStatusAuthoritativeOnly(status: TaxAssessmentStatus): void {
    if (status === TaxAssessmentStatus.PROPOSED) {
      throw new BadRequestException(
        'Assessment must be issued through authorized revenue workflow',
      );
    }
  }

  assertClearanceAuthoritativeConditions(
    conditions: Partial<Record<TaxClearanceConditionKey, boolean>>,
  ): void {
    for (const key of TAX_CLEARANCE_REQUIRED_CONDITION_KEYS) {
      if (conditions[key] !== true) {
        throw new BadRequestException(
          `${REVENUE_REASON_CODES.CLEARANCE_CONDITIONS_NOT_MET}: ${key}`,
        );
      }
    }
  }

  assertCalculationRecordsRuleVersion(ruleConfigurationVersion: number | undefined): void {
    if (ruleConfigurationVersion == null || ruleConfigurationVersion < 1) {
      throw new BadRequestException(
        'Calculation must record a positive rule configuration version',
      );
    }
  }
}
