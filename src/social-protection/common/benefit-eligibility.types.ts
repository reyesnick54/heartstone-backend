export interface BenefitEligibilityCalculationInput {
  benefitProgramVersionId: string;
  eligibilityRuleVersionReference: string;
  inputFacts: Record<string, unknown>;
  methodologyReference: string;
}

export interface BenefitEligibilityCalculationResult {
  outcomeCode: string;
  preliminaryEligible: boolean;
  requiresHumanDecision: boolean;
  calculationNotes: string;
  factorSummaries: { factorCode: string; summary: string }[];
}

export interface DeterministicBenefitEligibilityEngine {
  assess(input: BenefitEligibilityCalculationInput): BenefitEligibilityCalculationResult;
}
