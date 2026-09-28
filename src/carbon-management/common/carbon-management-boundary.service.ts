import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CarbonExternalVerificationStatus, CarbonManagementActorPersona } from '@prisma/client';

import {
  CARBON_MANAGEMENT_REASON_CODES,
  FORBIDDEN_AI_CARBON_MANAGEMENT_ACTIONS,
} from '../carbon-management.constants';
import { FORBIDDEN_CLIENT_AUTHORIZATION_FIELDS } from '../carbon-management-schema.constants';

@Injectable()
export class CarbonManagementBoundaryService {
  rejectClientAuthorizationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_AUTHORIZATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${CARBON_MANAGEMENT_REASON_CODES.APPLICANT_CANNOT_SELF_AUTHORIZE}: ${field}`,
        );
      }
    }
  }

  assertApplicantCannotSelfAuthorize(actorPersona: CarbonManagementActorPersona): void {
    if (actorPersona === CarbonManagementActorPersona.APPLICANT) {
      throw new ForbiddenException(CARBON_MANAGEMENT_REASON_CODES.APPLICANT_CANNOT_SELF_AUTHORIZE);
    }
  }

  assertAiCannotApproveAuthorization(
    actorPersona: CarbonManagementActorPersona,
    action: string,
  ): void {
    if (
      actorPersona === CarbonManagementActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_CARBON_MANAGEMENT_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(
        `AI assistance cannot perform carbon-management action: ${action}`,
      );
    }
  }

  assertPaymentDoesNotApproveAuthorization(actorPersona: CarbonManagementActorPersona): void {
    if (actorPersona === CarbonManagementActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException(
        'Payment receipt does not approve or issue carbon administrative authorization',
      );
    }
  }

  assertExternalVerificationIsNotAutonomousApproval(isOfficialApproval: boolean): void {
    if (isOfficialApproval) {
      throw new BadRequestException(
        'External verification records document attributable evidence only and cannot mark official approval',
      );
    }
  }

  assertExternalVerificationsResolved(
    verifications: {
      blocksFinalDecision: boolean;
      status: CarbonExternalVerificationStatus;
    }[],
  ): void {
    const blocking = verifications.filter(
      (verification) =>
        verification.blocksFinalDecision &&
        verification.status !== CarbonExternalVerificationStatus.COMPLETE &&
        verification.status !== CarbonExternalVerificationStatus.WAIVED,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(CARBON_MANAGEMENT_REASON_CODES.EXTERNAL_VERIFICATION_BLOCKS);
    }
  }

  assertAuthorizationRequiresGovernedInstrument(input: {
    governmentDecisionId?: string | null;
    officialInstrumentId?: string | null;
  }): void {
    if (!input.governmentDecisionId || !input.officialInstrumentId) {
      throw new BadRequestException(
        CARBON_MANAGEMENT_REASON_CODES.AUTHORIZATION_AUTHORITY_NOT_CONFIGURED,
      );
    }
  }

  rejectApplicantForgedExternalVerification(
    actorPersona: CarbonManagementActorPersona,
    isAuthenticated: boolean,
  ): void {
    if (actorPersona === CarbonManagementActorPersona.APPLICANT && isAuthenticated) {
      throw new ForbiddenException(CARBON_MANAGEMENT_REASON_CODES.EXTERNAL_VERIFICATION_BLOCKS);
    }
  }
}
