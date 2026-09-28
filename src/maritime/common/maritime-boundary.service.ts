import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MaritimeActorPersona, MaritimeExternalDependencyStatus } from '@prisma/client';

import { FORBIDDEN_AI_MARITIME_ACTIONS, MARITIME_REASON_CODES } from '../maritime.constants';
import { FORBIDDEN_CLIENT_INSTRUMENT_FIELDS } from '../maritime-schema.constants';

@Injectable()
export class MaritimeBoundaryService {
  rejectClientInstrumentFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_INSTRUMENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${MARITIME_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE}: ${field}`,
        );
      }
    }
  }

  assertApplicantCannotSelfIssue(actorPersona: MaritimeActorPersona): void {
    if (actorPersona === MaritimeActorPersona.APPLICANT) {
      throw new ForbiddenException(MARITIME_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE);
    }
  }

  assertAiCannotIssueInstrument(actorPersona: MaritimeActorPersona, action: string): void {
    if (
      actorPersona === MaritimeActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_MARITIME_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`AI assistance cannot perform maritime action: ${action}`);
    }
  }

  assertPaymentDoesNotIssueInstrument(actorPersona: MaritimeActorPersona): void {
    if (actorPersona === MaritimeActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException(
        'Payment receipt does not issue maritime administrative instruments',
      );
    }
  }

  assertExternalDependenciesResolved(
    dependencies: {
      blocksAbsezAdministrativeDecision: boolean;
      status: MaritimeExternalDependencyStatus;
    }[],
  ): void {
    const blocking = dependencies.filter(
      (dependency) =>
        dependency.blocksAbsezAdministrativeDecision &&
        dependency.status !== MaritimeExternalDependencyStatus.RESOLVED,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(MARITIME_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS);
    }
  }

  assertInstrumentRequiresGovernedOutcome(input: {
    governmentDecisionId?: string | null;
    officialInstrumentId?: string | null;
  }): void {
    if (!input.governmentDecisionId || !input.officialInstrumentId) {
      throw new BadRequestException(MARITIME_REASON_CODES.INSTRUMENT_AUTHORITY_NOT_CONFIGURED);
    }
  }

  assertCannotSpoofNationalDeterminationAsAbsez(input: {
    requiresCompetentAuthorityDetermination: boolean;
    absezIssuanceAttempt: boolean;
    externalResolved: boolean;
  }): void {
    if (
      input.requiresCompetentAuthorityDetermination &&
      input.absezIssuanceAttempt &&
      !input.externalResolved
    ) {
      throw new ForbiddenException(MARITIME_REASON_CODES.NATIONAL_DECISION_CANNOT_BE_SPOOFED);
    }
  }

  assertMaritimeApprovalDoesNotAuthorizeCustomsRelease(
    maritimeApprovalDoesNotAuthorizeCustomsRelease: boolean,
  ): void {
    if (!maritimeApprovalDoesNotAuthorizeCustomsRelease) {
      throw new BadRequestException(MARITIME_REASON_CODES.MARITIME_APPROVAL_NOT_CUSTOMS_RELEASE);
    }
  }

  rejectApplicantForgedExternalResponse(actorPersona: MaritimeActorPersona): void {
    if (actorPersona === MaritimeActorPersona.APPLICANT) {
      throw new ForbiddenException(MARITIME_REASON_CODES.NATIONAL_DECISION_CANNOT_BE_SPOOFED);
    }
  }

  assertVesselPartyDoesNotDuplicateIdentity(doesNotDuplicatePartyRecord: boolean): void {
    if (!doesNotDuplicatePartyRecord) {
      throw new BadRequestException(
        'Vessel party relationship must reference canonical party records only',
      );
    }
  }
}
