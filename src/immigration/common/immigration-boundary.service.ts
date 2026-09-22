import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ExternalDeterminationStatus,
  ImmigrationActorPersona,
  ImmigrationExternalCheckRecordedBy,
} from '@prisma/client';

import {
  FORBIDDEN_AI_IMMIGRATION_ACTIONS,
  FORBIDDEN_APPLICANT_EXTERNAL_CHECK_FIELDS,
  type SponsorAuthorizedScope,
} from '../immigration.constants';

@Injectable()
export class ImmigrationBoundaryService {
  assertAiCannotApprove(action: string): void {
    if (FORBIDDEN_AI_IMMIGRATION_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(`AI assistance cannot perform immigration action: ${action}`);
    }
  }

  assertPaymentDoesNotApproveImmigrationCase(actorPersona: ImmigrationActorPersona): void {
    if (actorPersona === ImmigrationActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException(
        'Payment receipt does not approve or decide an immigration case',
      );
    }
  }

  assertTechnicalAdminCannotChangeCitizenshipStatus(
    actorPersona: ImmigrationActorPersona,
    target: 'CITIZENSHIP_STATUS' | 'VISA' | 'RESIDENCY',
  ): void {
    if (
      actorPersona === ImmigrationActorPersona.TECHNICAL_ADMIN &&
      target === 'CITIZENSHIP_STATUS'
    ) {
      throw new ForbiddenException(
        'Technical administration cannot alter authoritative citizenship status',
      );
    }
  }

  rejectApplicantForgedExternalCheck(
    payload: Record<string, unknown>,
    actorPersona: ImmigrationActorPersona,
  ): void {
    if (actorPersona === ImmigrationActorPersona.APPLICANT) {
      for (const field of FORBIDDEN_APPLICANT_EXTERNAL_CHECK_FIELDS) {
        if (field in payload && payload[field] !== undefined) {
          throw new ForbiddenException(
            `Applicant may not set authenticated external check field "${field}"`,
          );
        }
      }
      throw new ForbiddenException(
        'Applicants cannot record authenticated external security or background determinations',
      );
    }
  }

  assertExternalCheckRecorderAllowed(
    recordedBy: ImmigrationExternalCheckRecordedBy,
    actorPersona: ImmigrationActorPersona,
  ): void {
    if (actorPersona === ImmigrationActorPersona.APPLICANT) {
      throw new ForbiddenException('Applicants cannot record immigration external checks');
    }
    if (
      actorPersona === ImmigrationActorPersona.AI_ASSISTANCE &&
      recordedBy !== ImmigrationExternalCheckRecordedBy.SYSTEM
    ) {
      throw new ForbiddenException('AI cannot attest external authority determinations');
    }
  }

  assertAuthenticatedExternalResult(input: {
    isAuthenticated: boolean;
    authenticatedPayloadHash?: string | null;
  }): void {
    if (input.isAuthenticated && !input.authenticatedPayloadHash) {
      throw new BadRequestException(
        'Authenticated external determinations require an authenticated payload hash',
      );
    }
  }

  assertUnresolvedExternalChecksAllowDecision(
    checks: {
      isRequired: boolean;
      blocksDecisionWhenRequired: boolean;
      determinationStatus: ExternalDeterminationStatus;
      isAuthenticated: boolean;
    }[],
  ): void {
    const blocking = checks.filter(
      (check) =>
        check.isRequired &&
        check.blocksDecisionWhenRequired &&
        (!check.isAuthenticated ||
          check.determinationStatus === ExternalDeterminationStatus.PENDING ||
          check.determinationStatus === ExternalDeterminationStatus.DENIED),
    );
    if (blocking.length > 0) {
      throw new BadRequestException(
        'Required external determinations must be authenticated and resolved before immigration decision',
      );
    }
  }

  assertSponsorScope(scope: SponsorAuthorizedScope, requested: keyof SponsorAuthorizedScope): void {
    if (!scope[requested]) {
      throw new ForbiddenException(`Sponsor access denied for scope: ${requested}`);
    }
  }

  assertCrossApplicantBlocked(requesterIdentityId: string, subjectIdentityId: string): void {
    if (requesterIdentityId !== subjectIdentityId) {
      throw new ForbiddenException('Cross-applicant immigration profile access is not permitted');
    }
  }

  assertNoDestructiveStatusOverwrite(existingRecordId: string | null | undefined): void {
    if (!existingRecordId) {
      return;
    }
    throw new BadRequestException(
      'Immigration status must be superseded with a new record; destructive overwrite is forbidden',
    );
  }
}
