import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CannabisAdministrationActorPersona,
  CannabisDelegatedLicenceFunctionActivation,
  CannabisExternalDependencyStatus,
} from '@prisma/client';

import {
  CANNABIS_REASON_CODES,
  FORBIDDEN_AI_CANNABIS_ACTIONS,
} from '../cannabis-administration.constants';
import { FORBIDDEN_CLIENT_LICENCE_ISSUANCE_FIELDS } from '../cannabis-administration-schema.constants';

@Injectable()
export class CannabisAdministrationBoundaryService {
  rejectClientForgedLicenceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_LICENCE_ISSUANCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${CANNABIS_REASON_CODES.CLIENT_LICENCE_FIELDS_FORBIDDEN}: ${field}`,
        );
      }
    }
  }

  assertApplicantCannotSelfIssueLicence(actorPersona: CannabisAdministrationActorPersona): void {
    if (actorPersona === CannabisAdministrationActorPersona.APPLICANT) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE);
    }
  }

  assertPaymentDoesNotApproveLicence(actorPersona: CannabisAdministrationActorPersona): void {
    if (actorPersona === CannabisAdministrationActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException('Payment receipt does not approve or issue a cannabis licence');
    }
  }

  assertAiCannotIssueLicence(action: string): void {
    if (
      FORBIDDEN_AI_CANNABIS_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_CANNABIS_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(`${CANNABIS_REASON_CODES.AI_CANNOT_ISSUE_LICENCE}: ${action}`);
    }
  }

  assertServiceIdentityCannotIssueLicence(actorPersona: CannabisAdministrationActorPersona): void {
    if (actorPersona === CannabisAdministrationActorPersona.AI_ASSISTANCE) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.AI_CANNOT_ISSUE_LICENCE);
    }
  }

  assertDelegatedFunctionActiveForIssuance(
    activation: CannabisDelegatedLicenceFunctionActivation,
    requiresDelegatedIssuance: boolean,
  ): void {
    if (
      requiresDelegatedIssuance &&
      activation !== CannabisDelegatedLicenceFunctionActivation.ACTIVE
    ) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.DELEGATED_FUNCTION_INACTIVE);
    }
  }

  assertExternalDependenciesResolved(
    dependencies: {
      blocksFinalDecision: boolean;
      status: CannabisExternalDependencyStatus;
    }[],
  ): void {
    const blocking = dependencies.filter(
      (dependency) =>
        dependency.blocksFinalDecision &&
        dependency.status !== CannabisExternalDependencyStatus.RESOLVED &&
        dependency.status !== CannabisExternalDependencyStatus.WAIVED,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(CANNABIS_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS);
    }
  }

  assertLicenceRequiresGovernedInstrument(input: {
    governmentDecisionId?: string | null;
    officialInstrumentId?: string | null;
  }): void {
    if (!input.governmentDecisionId || !input.officialInstrumentId) {
      throw new BadRequestException(CANNABIS_REASON_CODES.LICENCE_AUTHORITY_NOT_CONFIGURED);
    }
  }

  assertSuspensionRequiresConfiguredAuthority(input: {
    functionAuthorityRecordId?: string | null;
    authorityEvaluationRecordId?: string | null;
    governmentDecisionId?: string | null;
  }): void {
    const hasAuthority =
      Boolean(input.functionAuthorityRecordId) ||
      Boolean(input.authorityEvaluationRecordId) ||
      Boolean(input.governmentDecisionId);
    if (!hasAuthority) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.SUSPENSION_AUTHORITY_REQUIRED);
    }
  }

  assertInspectionFindingIsNotFinalSanction(isFinalSanctionDecision: boolean): void {
    if (isFinalSanctionDecision) {
      throw new BadRequestException(
        'Cannabis inspection references record findings separately from final sanction decisions',
      );
    }
  }

  assertRegulatoryFileAccessDenied(actorPersona: CannabisAdministrationActorPersona): void {
    if (actorPersona === CannabisAdministrationActorPersona.APPLICANT) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED);
    }
  }

  assertSiteLinkageDoesNotCreateCanonicalRecords(input: {
    createLandParcel?: boolean;
    createPlanningPermit?: boolean;
  }): void {
    if (input.createLandParcel || input.createPlanningPermit) {
      throw new BadRequestException(
        'Cannabis facility site references must link existing canonical land or planning records',
      );
    }
  }
}
