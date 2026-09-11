import { Injectable } from '@nestjs/common';
import { AuthorityEvaluationOutcome } from '@prisma/client';

import {
  AUTHORITY_EVALUATION_EXPLANATION_CODES,
  type AuthorityExplanationCode,
} from '../authority.constants';

export interface AuthorityExplanation {
  outcome: AuthorityEvaluationOutcome;
  codes: AuthorityExplanationCode[];
  summary: string;
  safeHalt: boolean;
  requiresRevalidation: boolean;
}

@Injectable()
export class AuthorityExplanationService {
  buildExplanation(
    outcome: AuthorityEvaluationOutcome,
    codes: AuthorityExplanationCode[],
  ): AuthorityExplanation {
    const safeHalt =
      outcome === AuthorityEvaluationOutcome.SAFE_HALT ||
      codes.includes(AUTHORITY_EVALUATION_EXPLANATION_CODES.SOURCE_CONFLICT);

    const requiresRevalidation =
      safeHalt ||
      outcome === AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION ||
      codes.some((code) =>
        [
          AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
          AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION,
          AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_APPOINTMENT,
          AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_SOURCE,
        ].includes(code as typeof AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION),
      );

    const summary = this.summarize(outcome, codes);

    return {
      outcome,
      codes,
      summary,
      safeHalt,
      requiresRevalidation,
    };
  }

  private summarize(
    outcome: AuthorityEvaluationOutcome,
    codes: AuthorityExplanationCode[],
  ): string {
    if (outcome === AuthorityEvaluationOutcome.ALLOW) {
      return 'Recorded authority permits this specific action in this context.';
    }

    if (outcome === AuthorityEvaluationOutcome.SAFE_HALT) {
      return 'Evaluation halted safely due to unresolved governing source conflict.';
    }

    if (outcome === AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION) {
      return 'Competent external authority determination is required before proceeding.';
    }

    const primary = codes[0] ?? AUTHORITY_EVALUATION_EXPLANATION_CODES.DENY;
    return `Authority evaluation denied: ${primary}`;
  }
}
