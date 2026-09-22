import { Injectable } from '@nestjs/common';
import { PreliminaryTrialMatchOutcome } from '@prisma/client';

import {
  CLINICAL_RESEARCH_MATCHING_DISCLAIMER,
  FORBIDDEN_PRELIMINARY_MATCH_OUTCOMES,
  PRELIMINARY_MATCH_OUTCOME_LABELS,
} from '../clinical-research.constants';

export interface PreliminaryMatchInput {
  participantAgeYears?: number;
  conditionCategoryCode?: string;
  trialMinimumAgeYears?: number | null;
  trialMaximumAgeYears?: number | null;
  trialConditionCategoryCode?: string | null;
}

export interface PreliminaryMatchResult {
  outcome: PreliminaryTrialMatchOutcome;
  outcomeLabel: string;
  isClinicalEligibility: false;
  disclaimer: string;
}

@Injectable()
export class PreliminaryTrialMatchingService {
  match(input: PreliminaryMatchInput): PreliminaryMatchResult {
    const outcome = this.computeOutcome(input);
    this.assertNotClinicallyEligibleLabel(outcome);

    return {
      outcome,
      outcomeLabel: PRELIMINARY_MATCH_OUTCOME_LABELS[outcome],
      isClinicalEligibility: false,
      disclaimer: CLINICAL_RESEARCH_MATCHING_DISCLAIMER,
    };
  }

  private computeOutcome(input: PreliminaryMatchInput): PreliminaryTrialMatchOutcome {
    if (
      input.participantAgeYears === undefined &&
      !input.conditionCategoryCode &&
      !input.trialConditionCategoryCode
    ) {
      return PreliminaryTrialMatchOutcome.NOT_ENOUGH_INFORMATION;
    }

    if (
      input.participantAgeYears !== undefined &&
      input.trialMinimumAgeYears != null &&
      input.participantAgeYears < input.trialMinimumAgeYears
    ) {
      return PreliminaryTrialMatchOutcome.LIKELY_NOT_MATCH;
    }

    if (
      input.participantAgeYears !== undefined &&
      input.trialMaximumAgeYears != null &&
      input.participantAgeYears > input.trialMaximumAgeYears
    ) {
      return PreliminaryTrialMatchOutcome.LIKELY_NOT_MATCH;
    }

    if (
      input.conditionCategoryCode &&
      input.trialConditionCategoryCode &&
      input.conditionCategoryCode !== input.trialConditionCategoryCode
    ) {
      return PreliminaryTrialMatchOutcome.LIKELY_NOT_MATCH;
    }

    if (input.participantAgeYears === undefined || !input.conditionCategoryCode) {
      return PreliminaryTrialMatchOutcome.NOT_ENOUGH_INFORMATION;
    }

    return PreliminaryTrialMatchOutcome.POTENTIAL_MATCH;
  }

  private assertNotClinicallyEligibleLabel(outcome: PreliminaryTrialMatchOutcome): void {
    const outcomeName = outcome as string;
    if (FORBIDDEN_PRELIMINARY_MATCH_OUTCOMES.includes(outcomeName as never)) {
      throw new Error('Preliminary matching must not emit clinically eligible outcomes');
    }
    if (outcomeName.toUpperCase().includes('ELIGIBLE')) {
      throw new Error('Preliminary matching must not emit clinically eligible outcomes');
    }
  }
}
