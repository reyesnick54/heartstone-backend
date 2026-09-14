import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { CLARIFICATION_FORBIDDEN_RESPONSE_FIELDS } from '../redress.constants';

export interface ClarificationResponseDraft {
  responseContent: string;
  proceduralExplanation?: string;
  referencedRequirement?: string;
  applicableDeadline?: Date;
  availableRoutes?: string[];
  displayedDataExplanation?: string;
  recordAccessGuidance?: string;
  newDecisionReasons?: string[];
  outcomeChange?: string;
  conditionChange?: string;
  inventedAuthority?: string;
  reconsiderationReplacement?: boolean;
  originalDecisionReasons?: string[];
}

@Injectable()
export class ClarificationBoundaryService {
  assertResponseWithinBounds(draft: ClarificationResponseDraft): void {
    for (const field of CLARIFICATION_FORBIDDEN_RESPONSE_FIELDS) {
      const value = draft[field as keyof ClarificationResponseDraft];
      if (value !== undefined && value !== false) {
        throw new ForbiddenException(
          `Clarification must not include "${field}"; use formal reconsideration instead`,
        );
      }
    }

    if (draft.newDecisionReasons && draft.newDecisionReasons.length > 0) {
      throw new ForbiddenException(
        'Clarification cannot manufacture new decision reasons after the fact',
      );
    }

    if (draft.originalDecisionReasons && draft.newDecisionReasons) {
      const original = new Set(draft.originalDecisionReasons);
      const proposed = draft.newDecisionReasons ?? [];
      for (const reason of proposed) {
        if (!original.has(reason)) {
          throw new ForbiddenException(
            'Clarification cannot add new reasons to cure an invalid decision',
          );
        }
      }
    }

    if (!draft.responseContent.trim()) {
      throw new BadRequestException('Clarification response must include explanatory content');
    }
  }
}
