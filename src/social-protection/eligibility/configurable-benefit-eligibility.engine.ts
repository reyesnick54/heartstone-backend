import { Injectable } from '@nestjs/common';

import {
  type BenefitEligibilityCalculationInput,
  type BenefitEligibilityCalculationResult,
  type DeterministicBenefitEligibilityEngine,
} from '../common/benefit-eligibility.types';

@Injectable()
export class ConfigurableBenefitEligibilityEngine implements DeterministicBenefitEligibilityEngine {
  assess(input: BenefitEligibilityCalculationInput): BenefitEligibilityCalculationResult {
    const configuredPass =
      input.inputFacts.configuredPreliminaryPass === true ||
      input.inputFacts.configuredPreliminaryPass === 'true';

    return {
      outcomeCode: configuredPass ? 'PRELIMINARILY_ELIGIBLE' : 'UNDETERMINED',
      preliminaryEligible: configuredPass,
      requiresHumanDecision: true,
      calculationNotes: `methodology=${input.methodologyReference};ruleVersion=${input.eligibilityRuleVersionReference}`,
      factorSummaries: [],
    };
  }
}
