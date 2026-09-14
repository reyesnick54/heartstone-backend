import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { FeeAdjustmentType, IdentityType } from '@prisma/client';

import {
  FORBIDDEN_AI_FINANCIAL_ACTIONS,
  FORBIDDEN_CLIENT_PAYMENT_FIELDS,
  PAYMENTS_REASON_CODES,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../payments.constants';

@Injectable()
export class PaymentsBoundaryService {
  assertAdjustmentRoutePermitted(
    adjustmentType: FeeAdjustmentType,
    permittedRoutes: FeeAdjustmentType[],
  ): void {
    if (!permittedRoutes.includes(adjustmentType)) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.WAIVER_ROUTE_NOT_PERMITTED);
    }
  }

  assertAiCannotApproveFinancialAction(action: string, actorIdentityType: IdentityType): void {
    if (actorIdentityType !== IdentityType.SERVICE) {
      return;
    }

    if (FORBIDDEN_AI_FINANCIAL_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.AI_CANNOT_APPROVE_FINANCIAL_ACTION);
    }
  }

  assertTechnicalAdminCannotWaive(actorRoles: string[] | undefined, adjustmentType: FeeAdjustmentType): void {
    if (
      adjustmentType === FeeAdjustmentType.WAIVER &&
      actorRoles?.includes(TECHNICAL_ADMIN_ROLE_MARKER)
    ) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.TECHNICAL_ADMIN_CANNOT_WAIVE);
    }
  }

  assertRefundWithinRefundableBalance(requestedCents: number, refundableCents: number): void {
    if (requestedCents > refundableCents) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.REFUND_EXCEEDS_REFUNDABLE_BALANCE);
    }
  }

  assertNoDuplicateRefund(existingRefundCount: number): void {
    if (existingRefundCount > 0) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.DUPLICATE_REFUND_BLOCKED);
    }
  }

  assertChargebackNotAuthorizedRefund(isChargeback: boolean): void {
    if (isChargeback) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.CHARGEBACK_NOT_AUTHORIZED_REFUND);
    }
  }

  assertReconciliationMismatchPreserved(matchStatus: string, forceMatch?: boolean): void {
    if (forceMatch && matchStatus !== 'MATCHED') {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.RECONCILIATION_MISMATCH_PRESERVED);
    }
  }

  assertCannotFabricateBankRecord(hasExternalEvidence: boolean): void {
    if (!hasExternalEvidence) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.CANNOT_FABRICATE_BANK_RECORD);
    }
  }

  assertArrearsNotSanction(enforcementAction?: string): void {
    if (enforcementAction) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.ARREARS_NOT_SANCTION);
    }
  }

  assertDisputeDoesNotEraseTransaction(eraseTransaction?: boolean): void {
    if (eraseTransaction) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.DISPUTE_DOES_NOT_ERASE_TRANSACTION);
    }
  }

  assertFinancialCorrectionPreservesOriginal(preservesOriginal: boolean): void {
    if (!preservesOriginal) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.FINANCIAL_CORRECTION_PRESERVES_ORIGINAL);
    }
  }

  assertAdjustmentCannotChangeGovernmentDecision(mutateDecision?: boolean): void {
    if (mutateDecision) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.ADJUSTMENT_CANNOT_CHANGE_GOVERNMENT_DECISION);
    }
  }

  assertSelfApprovalBlocked(requesterId: string, approverId: string): void {
    if (requesterId === approverId) {
      throw new ForbiddenException(PAYMENTS_REASON_CODES.SELF_APPROVAL_BLOCKED);
    }
  }

  assertSegregationEnforced(
    segregationRequired: boolean,
    requesterId: string,
    approverId: string,
  ): void {
    if (segregationRequired) {
      this.assertSelfApprovalBlocked(requesterId, approverId);
    }
  }

  assertFailedRefundNotSettled(status: string): void {
    if (status === 'FAILED') {
      throw new BadRequestException(PAYMENTS_REASON_CODES.PROVIDER_REFUND_FAILED_NOT_SETTLED);
    }
  }

  assertSubstantiveDisputeRequiresPhase10Route(
    isSubstantive: boolean,
    substantiveRouteReference?: string,
  ): void {
    if (isSubstantive && !substantiveRouteReference) {
      throw new BadRequestException(PAYMENTS_REASON_CODES.SUBSTANTIVE_DISPUTE_REQUIRES_PHASE_10_ROUTE);
    }
  }

  rejectForbiddenClientFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PAYMENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a payment record`);
      }
    }
  }
}
