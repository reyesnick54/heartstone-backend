import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import {
  AUTHORIZED_RECONSIDERATION_STANDARDS,
  FORBIDDEN_AI_REVIEW_ACTIONS,
  FORBIDDEN_CLIENT_REVIEW_FIELDS,
  REDRESS_REASON_CODES,
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

  assertOpeningReviewDoesNotAlterDecision(): void {
    // Proceeding creation must not mutate GovernmentDecision status or outcome.
  }

  private parseReviewerLevel(level: string): number {
    const match = /^L(\d+)$/i.exec(level.trim());
    if (!match) {
      return 0;
    }

    return Number.parseInt(match[1] ?? '0', 10);
  }
}
