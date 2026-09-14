import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ExternalAuthorityBindingClass,
  ExternalDeterminationAuthenticityStatus,
  ExternalReviewStatus,
  RetainedAppealAuthorityClass,
} from '@prisma/client';

import {
  AI_ACTOR_ROLE_MARKER,
  AI_CANNOT_DETERMINE_EXTERNAL_OUTCOME_MESSAGE,
  EXACT_SOURCE_WORDING_MESSAGE,
  EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE,
  FORBIDDEN_CLIENT_EXTERNAL_REVIEW_FIELDS,
  FORBIDDEN_INTERNAL_ADJUDICATION_OUTCOMES,
  JUDICIAL_ROUTE_NOT_COURT_MESSAGE,
  PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE,
  RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE,
  RETAINED_NATIONAL_APPEAL_MESSAGE,
  SILENCE_NOT_APPEAL_SUCCESS_MESSAGE,
  TECHNICAL_ADMIN_CANNOT_FABRICATE_DETERMINATION_MESSAGE,
  TECHNICAL_ADMIN_ROLE_MARKER,
  UNAUTHENTICATED_DETERMINATION_MESSAGE,
} from '../redress.constants';

@Injectable()
export class ExternalReviewBoundaryService {
  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_EXTERNAL_REVIEW_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on external review records`);
      }
    }
  }

  assertNotInternalAdjudication(input: {
    attemptingInternalOutcome?: boolean;
    blocksInternalAdjudication?: boolean;
  }): void {
    if (input.blocksInternalAdjudication && input.attemptingInternalOutcome) {
      throw new ForbiddenException(
        `${EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE}. ${RETAINED_NATIONAL_APPEAL_MESSAGE}`,
      );
    }
  }

  assertRetainedNationalAuthorityBlocksAdjudication(input: {
    retainsNationalAuthority: boolean;
    attemptingAdjudication?: boolean;
  }): void {
    if (input.retainsNationalAuthority && input.attemptingAdjudication) {
      throw new ForbiddenException(RETAINED_NATIONAL_APPEAL_MESSAGE);
    }
  }

  assertJudicialRouteIsNotCourt(input: { isCourtSystem?: boolean }): void {
    if (input.isCourtSystem === true) {
      throw new BadRequestException(JUDICIAL_ROUTE_NOT_COURT_MESSAGE);
    }
  }

  assertSilenceIsNotSuccess(input: { inferredApprovalFromSilence?: boolean }): void {
    if (input.inferredApprovalFromSilence === true) {
      throw new BadRequestException(SILENCE_NOT_APPEAL_SUCCESS_MESSAGE);
    }
  }

  assertProfessionalIndependence(input: { technologySubstitutesAuthority?: boolean }): void {
    if (input.technologySubstitutesAuthority === true) {
      throw new ForbiddenException(PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE);
    }
  }

  assertRecommendationNotBindingUnlessAuthenticated(input: {
    bindingClass: ExternalAuthorityBindingClass;
    isAuthenticated: boolean;
    isRecommendatoryOnly?: boolean;
  }): void {
    if (
      input.isRecommendatoryOnly === true &&
      input.bindingClass === ExternalAuthorityBindingClass.BINDING
    ) {
      throw new BadRequestException(RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE);
    }

    if (input.bindingClass === ExternalAuthorityBindingClass.BINDING && !input.isAuthenticated) {
      throw new BadRequestException(RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE);
    }
  }

  assertAuthenticatedBeforeImplementation(input: {
    isAuthenticated: boolean;
    implementationAuthorized: boolean;
    authenticityStatus: ExternalDeterminationAuthenticityStatus;
  }): void {
    if (input.implementationAuthorized && !input.isAuthenticated) {
      throw new ForbiddenException(UNAUTHENTICATED_DETERMINATION_MESSAGE);
    }

    if (
      input.implementationAuthorized &&
      input.authenticityStatus !== ExternalDeterminationAuthenticityStatus.AUTHENTICATED
    ) {
      throw new ForbiddenException(UNAUTHENTICATED_DETERMINATION_MESSAGE);
    }
  }

  assertOutcomePreservesSourceWording(input: {
    sourceOutcomeText: string;
    proposedOutcomeText: string;
    sourceReference?: string | null;
    proposedReference?: string | null;
  }): void {
    if (input.proposedOutcomeText !== input.sourceOutcomeText) {
      throw new ForbiddenException(EXACT_SOURCE_WORDING_MESSAGE);
    }

    if (
      input.sourceReference &&
      input.proposedReference &&
      input.proposedReference !== input.sourceReference
    ) {
      throw new ForbiddenException(EXACT_SOURCE_WORDING_MESSAGE);
    }
  }

  assertSecurityClassificationPreserved(input: {
    packageClassification: string;
    referralClassification: string;
  }): void {
    if (input.packageClassification !== input.referralClassification) {
      throw new BadRequestException(
        'External review package security classification must match referral classification',
      );
    }
  }

  assertAiCannotDetermineOutcome(input: { actorRoleMarker?: string }): void {
    if (input.actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(AI_CANNOT_DETERMINE_EXTERNAL_OUTCOME_MESSAGE);
    }
  }

  assertTechnicalAdminCannotFabricateDetermination(input: {
    actorRoleMarker?: string;
    hasOfficeholderAuthority?: boolean;
    markingAuthenticated?: boolean;
  }): void {
    if (
      input.actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER &&
      input.hasOfficeholderAuthority !== true &&
      input.markingAuthenticated === true
    ) {
      throw new ForbiddenException(TECHNICAL_ADMIN_CANNOT_FABRICATE_DETERMINATION_MESSAGE);
    }
  }

  assertApprovedOutcomeRequiresAuthentication(input: {
    outcomeText: string;
    isAuthenticated: boolean;
  }): void {
    const normalized = input.outcomeText.trim().toUpperCase();
    const usesApprovedLanguage = FORBIDDEN_INTERNAL_ADJUDICATION_OUTCOMES.some((term) =>
      normalized.includes(term),
    );

    if (usesApprovedLanguage && !input.isAuthenticated) {
      throw new ForbiddenException(
        'APPROVED or equivalent adjudicative language requires authenticated external determination',
      );
    }
  }

  assertJudicialOutcomeRequiresAuthentication(input: {
    outcomeCharacterization?: string | null;
    outcomeAuthenticated: boolean;
  }): void {
    if (input.outcomeCharacterization && !input.outcomeAuthenticated) {
      throw new ForbiddenException(
        'Judicial outcome characterization requires authenticated external record',
      );
    }
  }

  isRetainedAppealAuthority(retainedAuthorityClass?: RetainedAppealAuthorityClass | null): boolean {
    if (!retainedAuthorityClass) {
      return false;
    }

    return [
      RetainedAppealAuthorityClass.NATIONAL_STATUTORY,
      RetainedAppealAuthorityClass.PROFESSIONAL_DISCIPLINE,
      RetainedAppealAuthorityClass.REGULATORY,
      RetainedAppealAuthorityClass.JUDICIAL,
      RetainedAppealAuthorityClass.OTHER_RETAINED,
    ].includes(retainedAuthorityClass);
  }

  referralIsInternalAdjudication(): boolean {
    return false;
  }

  canTransitionStatus(from: ExternalReviewStatus, to: ExternalReviewStatus): boolean {
    if (from === ExternalReviewStatus.SAFE_HALTED || to === ExternalReviewStatus.SAFE_HALTED) {
      return true;
    }

    const ordered: ExternalReviewStatus[] = [
      ExternalReviewStatus.PREPARATION,
      ExternalReviewStatus.READY_FOR_TRANSMISSION,
      ExternalReviewStatus.TRANSMITTED,
      ExternalReviewStatus.ACKNOWLEDGED,
      ExternalReviewStatus.UNDER_EXTERNAL_REVIEW,
      ExternalReviewStatus.FURTHER_INFORMATION_REQUESTED,
      ExternalReviewStatus.HEARING_SCHEDULED,
      ExternalReviewStatus.EXTERNAL_DETERMINATION_RECEIVED,
      ExternalReviewStatus.IMPLEMENTATION_PENDING,
      ExternalReviewStatus.CLOSED,
    ];

    if (to === ExternalReviewStatus.UNKNOWN) {
      return true;
    }

    const fromIndex = ordered.indexOf(from);
    const toIndex = ordered.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) {
      return true;
    }

    return toIndex >= fromIndex || to === ExternalReviewStatus.CLOSED;
  }
}
