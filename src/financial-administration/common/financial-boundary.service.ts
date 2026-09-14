import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { FeeScheduleLifecycleStatus, IdentityType } from '@prisma/client';

import {
  FINANCIAL_REASON_CODES,
  FORBIDDEN_AI_FINANCIAL_ACTIONS,
  FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS,
  FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS,
  FORBIDDEN_CLIENT_INVOICE_FIELDS,
  FORBIDDEN_CLIENT_INVOICE_LINE_FIELDS,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../financial-administration.constants';

@Injectable()
export class FinancialBoundaryService {
  rejectClientProtectedFeeScheduleFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a fee schedule record`);
      }
    }
  }

  rejectClientProtectedFeeAssessmentFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(FINANCIAL_REASON_CODES.CLIENT_AMOUNT_FORBIDDEN + `: ${field}`);
      }
    }
  }

  rejectClientProtectedInvoiceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_INVOICE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on an invoice`);
      }
    }
  }

  rejectClientProtectedInvoiceLineFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_INVOICE_LINE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(FINANCIAL_REASON_CODES.CLIENT_AMOUNT_FORBIDDEN + `: ${field}`);
      }
    }
  }

  assertTechnicalAdminCannotActivateFeeSchedule(actorRoleMarker?: string): void {
    if (actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER) {
      throw new ForbiddenException(FINANCIAL_REASON_CODES.ADMIN_OVERRIDE_FORBIDDEN);
    }
  }

  assertAiCannotPerformFinancialAction(actorIdentityType: IdentityType, action: string): void {
    if (actorIdentityType !== IdentityType.SERVICE) {
      return;
    }

    if (
      FORBIDDEN_AI_FINANCIAL_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_FINANCIAL_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(`AI assistance cannot perform financial action: ${action}`);
    }
  }

  assertScheduleVersionUsableForAssessment(status: FeeScheduleLifecycleStatus): void {
    if (status !== FeeScheduleLifecycleStatus.ACTIVE) {
      throw new BadRequestException(FINANCIAL_REASON_CODES.SCHEDULE_NOT_ACTIVE);
    }
  }

  assertClientCannotSelectArbitraryFee(
    requestedFeeScheduleItemId: string | undefined,
    allowedItemIds: string[],
  ): void {
    if (requestedFeeScheduleItemId && !allowedItemIds.includes(requestedFeeScheduleItemId)) {
      throw new ForbiddenException(FINANCIAL_REASON_CODES.ARBITRARY_FEE_FORBIDDEN);
    }
  }

  assertInvoicePaidDoesNotCreateApproval(): void {
    // Invoice PAID status records payment receipt only; it does not create substantive approval.
  }

  assertFeeCalculationDoesNotIssueInstrument(): void {
    // Fee assessment and invoice creation do not issue official instruments.
  }

  assertInvoiceDoesNotAlterApplicationDecision(): void {
    // Invoice creation must not mutate application or case decision state.
  }
}
