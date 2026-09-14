import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { RedressRouteCategory } from '@prisma/client';

import {
  APPEAL_ROUTE_CATEGORIES,
  COMPLAINT_ROUTE_CATEGORIES,
  FORBIDDEN_AI_REDIST_ACTIONS,
  FORBIDDEN_CLIENT_REDIST_FIELDS,
} from '../redress.constants';

@Injectable()
export class RedressBoundaryService {
  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_REDIST_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a redress record`);
      }
    }
  }

  assertComplaintNotAppeal(category: RedressRouteCategory): void {
    if (APPEAL_ROUTE_CATEGORIES.includes(category)) {
      throw new BadRequestException('Complaint route cannot be used for appeal proceedings');
    }
  }

  assertAppealNotComplaint(category: RedressRouteCategory): void {
    if (COMPLAINT_ROUTE_CATEGORIES.includes(category)) {
      throw new BadRequestException('Appeal route cannot be mislabeled as a service complaint');
    }
  }

  assertFilingDoesNotEstablishStanding(reason?: string): void {
    if (reason?.toLowerCase().includes('filing establishes standing')) {
      throw new BadRequestException('Filing does not establish standing');
    }
  }

  assertAiCannotAdjudicate(action: string): void {
    if (FORBIDDEN_AI_REDIST_ACTIONS.includes(action as (typeof FORBIDDEN_AI_REDIST_ACTIONS)[number])) {
      throw new ForbiddenException(`AI cannot perform redress action: ${action}`);
    }
  }

  assertAiCannotDecide(isAiActor: boolean): void {
    if (isAiActor) {
      throw new ForbiddenException('AI assistance cannot record redress dispositions');
    }
  }

  assertClassificationNotDisposition(
    classifiedOnly: boolean,
    dispositionRequested: boolean,
  ): void {
    if (classifiedOnly && dispositionRequested) {
      throw new BadRequestException('Classification does not equal disposition');
    }
  }

  assertNonSubstantiveCorrection(input: {
    altersSubstantiveOutcome?: boolean;
    altersMaterialReasons?: boolean;
    removesReviewRights?: boolean;
  }): void {
    if (input.altersSubstantiveOutcome) {
      throw new BadRequestException(
        'Administrative correction cannot alter substantive outcome',
      );
    }
    if (input.altersMaterialReasons) {
      throw new BadRequestException('Administrative correction cannot alter material reasons');
    }
    if (input.removesReviewRights) {
      throw new BadRequestException('Administrative correction cannot remove review rights');
    }
  }

  assertClarificationNotSubstantive(altersSubstantiveDecision: boolean): void {
    if (altersSubstantiveDecision) {
      throw new BadRequestException('Clarification cannot alter substantive decision');
    }
  }

  assertRecommendationNotFinal(isRecommendation: boolean, isFinalDisposition: boolean): void {
    if (isRecommendation && isFinalDisposition) {
      throw new BadRequestException('Recommendation does not equal final redress disposition');
    }
  }

  assertOriginalPreserved(originalPreserved: boolean): void {
    if (!originalPreserved) {
      throw new BadRequestException('Original government decision must be preserved during redress');
    }
  }

  assertRouteCategoryMatches(
    requestedCategory: RedressRouteCategory | null | undefined,
    routeCategory: RedressRouteCategory,
  ): void {
    if (requestedCategory && requestedCategory !== routeCategory) {
      throw new BadRequestException(
        `Requested route category ${requestedCategory} does not match route definition ${routeCategory}`,
      );
    }
  }

  assertNoAutoStay(automaticStayConfigured: boolean, stayGranted: boolean): void {
    if (stayGranted && !automaticStayConfigured) {
      throw new BadRequestException('Interim stay requires explicit authorized action');
    }
  }

  assertSubstantiveRemedyPermitted(
    permitsSubstantiveChange: boolean,
    isSubstantive: boolean,
  ): void {
    if (isSubstantive && !permitsSubstantiveChange) {
      throw new BadRequestException('Route does not permit substantive remedy');
    }
  }

  assertNonSubstantiveRouteOnly(
    permitsNonSubstantiveCorrection: boolean,
    isNonSubstantive: boolean,
  ): void {
    if (isNonSubstantive && !permitsNonSubstantiveCorrection) {
      throw new BadRequestException('Route does not permit nonsubstantive correction');
    }
  }
}
