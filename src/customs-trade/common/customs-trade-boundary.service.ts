import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CustomsActorPersona,
  CustomsClassificationReferenceKind,
  CustomsPermitReferenceStatus,
  CustomsValuationKind,
} from '@prisma/client';

import {
  CUSTOMS_REASON_CODES,
  FORBIDDEN_AI_CUSTOMS_ACTIONS,
  PLATFORM_ADMIN_CUSTOMS_ROLE_MARKER,
} from '../customs-trade.constants';
import {
  FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS,
  FORBIDDEN_CUSTOMS_HOLD_CLIENT_FIELDS,
  FORBIDDEN_CUSTOMS_RELEASE_CLIENT_FIELDS,
} from '../customs-trade-schema.constants';

@Injectable()
export class CustomsTradeBoundaryService {
  assertDeclarationSubmissionDoesNotReleaseCargo(doesNotReleaseCargo: boolean): void {
    if (!doesNotReleaseCargo) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.DECLARATION_NOT_RELEASE);
    }
  }

  assertPaymentDoesNotReleaseCargo(actorPersona: CustomsActorPersona): void {
    if (actorPersona === CustomsActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.PAYMENT_NOT_RELEASE);
    }
  }

  rejectClientForgedAssessmentFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${CUSTOMS_REASON_CODES.CLIENT_ASSESSMENT_FORBIDDEN}: ${field}`,
        );
      }
    }
  }

  rejectClientForgedHoldRemovalFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CUSTOMS_HOLD_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`${CUSTOMS_REASON_CODES.HOLD_GOVERNED_REMOVAL}: ${field}`);
      }
    }
  }

  rejectClientForgedReleaseFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CUSTOMS_RELEASE_CLIENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`${CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE}: ${field}`);
      }
    }
  }

  assertValuationKindForRole(
    valuationKind: CustomsValuationKind,
    role: 'declared' | 'assessed' | 'accepted',
  ): void {
    if (role === 'declared' && valuationKind !== CustomsValuationKind.DECLARED) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.VALUATION_KIND_MISMATCH);
    }
    if (
      role === 'assessed' &&
      valuationKind !== CustomsValuationKind.ASSESSED &&
      valuationKind !== CustomsValuationKind.ACCEPTED
    ) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.VALUATION_KIND_MISMATCH);
    }
    if (role === 'accepted' && valuationKind !== CustomsValuationKind.ACCEPTED) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.VALUATION_KIND_MISMATCH);
    }
  }

  assertDeclaredAndAssessedValuesDistinct(
    declared: { valuationKind: CustomsValuationKind } | undefined,
    assessed: { valuationKind: CustomsValuationKind } | undefined,
  ): void {
    if (!declared || !assessed) {
      return;
    }
    if (
      declared.valuationKind !== CustomsValuationKind.DECLARED ||
      assessed.valuationKind === CustomsValuationKind.DECLARED
    ) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.VALUATION_KIND_MISMATCH);
    }
  }

  assertRiskScoreIsNotViolation(
    riskScoreIsNotViolation: boolean,
    treatingAsViolation: boolean,
  ): void {
    if (treatingAsViolation && riskScoreIsNotViolation) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.RISK_NOT_VIOLATION);
    }
  }

  assertAiCannotAuthorizeRelease(action: string, actorPersona: CustomsActorPersona): void {
    if (
      actorPersona === CustomsActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_CUSTOMS_ACTIONS.includes(action as (typeof FORBIDDEN_AI_CUSTOMS_ACTIONS)[number])
    ) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE);
    }
  }

  assertAiClassificationNotAuthoritative(
    kind: CustomsClassificationReferenceKind,
    isAuthoritative: boolean,
  ): void {
    if (kind === CustomsClassificationReferenceKind.AI_SUGGESTION && isAuthoritative) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.AI_CANNOT_RELEASE);
    }
  }

  assertMandatoryPermitsResolved(
    permits: {
      isMandatoryForRelease: boolean;
      blocksReleaseWhenUnresolved: boolean;
      status: CustomsPermitReferenceStatus;
    }[],
  ): void {
    const blocking = permits.filter(
      (permit) =>
        permit.isMandatoryForRelease &&
        permit.blocksReleaseWhenUnresolved &&
        permit.status === CustomsPermitReferenceStatus.UNRESOLVED_MANDATORY,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(CUSTOMS_REASON_CODES.MANDATORY_PERMIT_BLOCKS);
    }
  }

  assertTechnicalAdminCannotReleaseShipment(
    actorPersona: CustomsActorPersona,
    actorRoleMarker?: string,
  ): void {
    if (
      actorPersona === CustomsActorPersona.TECHNICAL_ADMIN ||
      actorRoleMarker === PLATFORM_ADMIN_CUSTOMS_ROLE_MARKER
    ) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.TECHNICAL_ADMIN_CANNOT_RELEASE);
    }
  }

  assertCrossCompanyAccessBlocked(
    requesterOrganizationId: string,
    ownerOrganizationId: string,
  ): void {
    if (requesterOrganizationId !== ownerOrganizationId) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.CROSS_COMPANY_DENIED);
    }
  }
}
