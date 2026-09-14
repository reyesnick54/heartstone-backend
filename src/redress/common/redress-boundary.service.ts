import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  IdentityType,
  InterimReliefRequestType,
  RedressDecisionOutcome,
  RedressRemedyType,
} from '@prisma/client';

import {
  AUTHORIZED_RECONSIDERATION_STANDARDS,
  FORBIDDEN_AI_REDRESS_ACTORS,
  FORBIDDEN_AI_REVIEW_ACTIONS,
  FORBIDDEN_CLIENT_REDRESS_FIELDS,
  FORBIDDEN_CLIENT_REVIEW_FIELDS,
  INSTRUMENT_REMEDY_TYPES,
  REDRESS_REASON_CODES,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../redress.constants';

@Injectable()
export class RedressBoundaryService {
  assertAssignmentDoesNotCreateAuthority(): void {
    // Assignment records operational responsibility only; HEAR_REVIEW authority is evaluated separately.
  }

  assertTechnicalPermissionDoesNotCreateReviewAuthority(): void {
    // Technical access or system roles do not satisfy review authority requirements.
  }

  assertNoSystemAdministratorOverride(overrideRequested?: boolean): void {
    if (overrideRequested) {
      throw new ForbiddenException(REDRESS_REASON_CODES.ADMIN_OVERRIDE_FORBIDDEN);
    }
  }

  assertAiCannotIssueDispositionRecommendation(
    actorIdentityType: IdentityType,
    recommendationType: string,
  ): void {
    if (actorIdentityType !== IdentityType.SERVICE) {
      return;
    }

    const dispositionTypes = ['AFFIRM', 'REVERSE', 'VARY', 'REMAND', 'SET_ASIDE', 'DISMISS'];

    if (dispositionTypes.includes(recommendationType)) {
      throw new ForbiddenException(
        `${REDRESS_REASON_CODES.AI_RECOMMENDATION_NON_FINAL}: ${FORBIDDEN_AI_REVIEW_ACTIONS.join(', ')}`,
      );
    }
  }

  assertRecommendationNonFinal(isFinal: boolean | undefined): void {
    if (isFinal === true) {
      throw new BadRequestException(REDRESS_REASON_CODES.RECOMMENDATION_CANNOT_BE_FINAL);
    }
  }

  assertReviewStandardConfigured(reviewStandard: string): void {
    if (!AUTHORIZED_RECONSIDERATION_STANDARDS.includes(reviewStandard as never)) {
      throw new BadRequestException(REDRESS_REASON_CODES.REVIEW_STANDARD_NOT_CONFIGURED);
    }
  }

  assertJurisdictionMatches(expectedJurisdictionId: string, actualJurisdictionId: string): void {
    if (expectedJurisdictionId !== actualJurisdictionId) {
      throw new BadRequestException(REDRESS_REASON_CODES.WRONG_JURISDICTION);
    }
  }

  assertReviewerLevelSufficient(requiredLevel: string, reviewerLevel: string): void {
    const required = this.parseReviewerLevel(requiredLevel);
    const actual = this.parseReviewerLevel(reviewerLevel);

    if (actual < required) {
      throw new BadRequestException(REDRESS_REASON_CODES.INSUFFICIENT_REVIEWER_LEVEL);
    }
  }

  assertClientCannotSupplyProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_REVIEW_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client cannot supply protected field: ${field}`);
      }
    }
  }

  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_REDRESS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a redress record`);
      }
    }
  }

  assertOpeningReviewDoesNotAlterDecision(): void {
    // Proceeding creation must not mutate GovernmentDecision status or outcome.
  }

  assertHumanReviewer(actorType: string): void {
    if (
      FORBIDDEN_AI_REDRESS_ACTORS.includes(
        actorType as (typeof FORBIDDEN_AI_REDRESS_ACTORS)[number],
      )
    ) {
      throw new ForbiddenException(
        'Only authorized human officeholders may make final redress determinations',
      );
    }
  }

  assertTechnicalAdminCannotCreateDecision(actorRoleMarker?: string): void {
    if (actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER) {
      throw new ForbiddenException(
        'Technical administrators cannot create RedressDecision records',
      );
    }
  }

  assertOutcomePermittedForRoute(
    outcome: RedressDecisionOutcome,
    permissibleOutcomes: string[],
  ): void {
    if (!permissibleOutcomes.includes(outcome)) {
      throw new BadRequestException(
        `Outcome ${outcome} is not permitted for this redress route version`,
      );
    }
  }

  assertRemedyPermittedForRoute(
    remedyType: RedressRemedyType,
    permissibleRemedies: string[],
  ): void {
    if (!permissibleRemedies.includes(remedyType)) {
      throw new BadRequestException(
        `Remedy ${remedyType} is not permitted for this redress route version`,
      );
    }
  }

  assertInterimReliefPermittedForRoute(
    requestType: InterimReliefRequestType,
    permissibleTypes: string[],
  ): void {
    if (!permissibleTypes.includes(requestType)) {
      throw new BadRequestException(
        `Interim relief type ${requestType} is not permitted for this redress route version`,
      );
    }
  }

  assertFilingDoesNotAutoStay(automaticStayOnFiling: boolean, stayCreated: boolean): void {
    if (!automaticStayOnFiling && stayCreated) {
      throw new BadRequestException(
        'Filing an appeal does not create an automatic stay unless route configuration explicitly permits it',
      );
    }
  }

  assertStayIsNotReversal(isReversal: boolean): void {
    if (isReversal) {
      throw new BadRequestException(
        'A stay is not a reversal; use authorized disposition outcomes instead',
      );
    }
  }

  assertIndependenceRequired(
    requiresIndependence: boolean,
    originalReviewerOfficeholderId: string | null | undefined,
    reviewerOfficeholderId: string,
  ): void {
    if (
      requiresIndependence &&
      originalReviewerOfficeholderId &&
      originalReviewerOfficeholderId === reviewerOfficeholderId
    ) {
      throw new ForbiddenException(
        'Original decision-maker cannot self-review where route independence is required',
      );
    }
  }

  assertReasonedDeterminationRequired(
    requiresReasonedDetermination: boolean,
    reasonSections: { humanConfirmed: boolean }[],
  ): void {
    if (!requiresReasonedDetermination) {
      return;
    }

    if (reasonSections.length === 0) {
      throw new BadRequestException('Route configuration requires a reasoned determination');
    }

    const unconfirmed = reasonSections.some((section) => !section.humanConfirmed);
    if (unconfirmed) {
      throw new BadRequestException(
        'AI may draft reasons but final reasons must be attributable to the reviewer',
      );
    }
  }

  assertInstrumentRemedyUsesLifecycleService(
    remedyType: RedressRemedyType,
    lifecycleServiceReference?: string | null,
  ): void {
    if (
      INSTRUMENT_REMEDY_TYPES.includes(remedyType as (typeof INSTRUMENT_REMEDY_TYPES)[number]) &&
      !lifecycleServiceReference
    ) {
      throw new BadRequestException(
        'Instrument remedy changes must invoke Phase 8 lifecycle services; direct status PATCH is not permitted',
      );
    }
  }

  assertFurtherReviewRightsFromConfiguration(
    configuredRights: string[],
    requestedRights: string[],
  ): string[] {
    return requestedRights.filter((right) => configuredRights.includes(right));
  }

  private parseReviewerLevel(level: string): number {
    const match = /^L(\d+)$/i.exec(level.trim());
    if (!match) {
      return 0;
    }

    return Number.parseInt(match[1] ?? '0', 10);
  }
}
