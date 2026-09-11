import { type AuthorityConditionType, type ConditionFailureBehavior } from '@prisma/client';

import { type AuthorityEvaluationOutcome } from './authority-evaluation-outcome.enum';

export interface ConditionEvaluationDetail {
  conditionId: string;
  conditionType: AuthorityConditionType;
  mandatory: boolean;
  satisfied: boolean;
  outcome: AuthorityEvaluationOutcome;
  failureBehavior: ConditionFailureBehavior;
  reason: string;
}

export interface SegregationOfDutiesViolation {
  ruleCode: string;
  reason: string;
}

export interface AuthorityEvaluationResult {
  outcome: AuthorityEvaluationOutcome;
  allowed: boolean;
  conditionDetails: ConditionEvaluationDetail[];
  segregationViolations: SegregationOfDutiesViolation[];
  reasons: string[];
}
