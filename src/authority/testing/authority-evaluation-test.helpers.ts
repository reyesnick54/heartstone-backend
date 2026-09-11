import {
  type AuthorityCondition,
  AuthorityConditionStatus,
  AuthorityConditionType,
  ConditionFailureBehavior,
  type GovernmentAction,
} from '@prisma/client';

import { type AuthorityEvaluationContext } from '../domain/authority-evaluation-context';
import { ConflictStatus, RecusalStatus } from '../domain/conflict-recusal-status.enum';
import { type EvidenceRequirementStatus } from '../domain/evidence-requirement-status.enum';
import { GovernmentActionType } from '../domain/government-action.enum';
import { QualificationVerificationStatus } from '../domain/qualification-verification-status.enum';
import { type SegregationOfDutiesRuleCode } from '../segregation/segregation-of-duties.rules';

const BASE_DATE = new Date('2026-06-01T12:00:00.000Z');

export function createTestContext(
  overrides: Partial<AuthorityEvaluationContext> = {},
): AuthorityEvaluationContext {
  return {
    actor: { identityId: 'actor-identity-1' },
    functionCode: 'LICENSE_ISSUANCE',
    requestedAction: GovernmentActionType.DECIDE,
    evaluatedAt: BASE_DATE,
    evidenceStatuses: [],
    qualificationStatuses: [],
    conflictStatus: ConflictStatus.NONE,
    recusalStatus: RecusalStatus.NONE,
    priorActions: [],
    concurrenceStatuses: [],
    approvedAttributes: [],
    ...overrides,
  };
}

export function createTestCondition(
  overrides: Partial<AuthorityCondition> & {
    conditionType: AuthorityConditionType;
    configuration: AuthorityCondition['configuration'];
  },
): AuthorityCondition {
  return {
    id: overrides.id ?? 'condition-1',
    functionAuthorityRecordId: overrides.functionAuthorityRecordId ?? 'far-1',
    governmentFunctionId: overrides.governmentFunctionId ?? null,
    actionRight: overrides.actionRight ?? null,
    conditionType: overrides.conditionType,
    requiredAction: overrides.requiredAction ?? null,
    configuration: overrides.configuration,
    mandatory: overrides.mandatory ?? true,
    effectiveFrom: overrides.effectiveFrom ?? new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: overrides.effectiveUntil ?? null,
    status: overrides.status ?? AuthorityConditionStatus.ACTIVE,
    failureBehavior: overrides.failureBehavior ?? ConditionFailureBehavior.BLOCK,
    createdAt: overrides.createdAt ?? BASE_DATE,
    updatedAt: overrides.updatedAt ?? BASE_DATE,
  };
}

export function evidenceCondition(
  evidenceId: string,
  requiredStatus: EvidenceRequirementStatus,
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.REQUIRED_EVIDENCE,
    configuration: { evidenceId, requiredStatus },
    ...overrides,
  });
}

export function qualificationCondition(
  qualificationCode: string,
  requiredStatus: QualificationVerificationStatus = QualificationVerificationStatus.VERIFIED,
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.REQUIRED_QUALIFICATION,
    configuration: { qualificationCode, requiredStatus },
    ...overrides,
  });
}

export function transactionLimitCondition(
  maxAmount: number,
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.TRANSACTION_LIMIT,
    configuration: { maxAmount },
    ...overrides,
  });
}

export function jurisdictionLimitCondition(
  jurisdictionIds: string[],
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.JURISDICTION_LIMIT,
    configuration: { jurisdictionIds },
    ...overrides,
  });
}

export function conflictCheckCondition(
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.CONFLICT_CHECK,
    configuration: { blockOnActiveConflict: true },
    ...overrides,
  });
}

export function recusalCheckCondition(
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.RECUSAL_CHECK,
    configuration: { blockOnActiveRecusal: true },
    ...overrides,
  });
}

export function sodCondition(
  ruleCode: SegregationOfDutiesRuleCode,
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.SEGREGATION_OF_DUTIES,
    configuration: { ruleCode },
    ...overrides,
  });
}

export function secondApprovalCondition(
  minApprovals: number,
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.SECOND_APPROVAL,
    configuration: { minApprovals },
    ...overrides,
  });
}

export function activationCondition(
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.ACTIVATION_REQUIRED,
    configuration: { requiredActivationStatus: 'ACTIVE' },
    ...overrides,
  });
}

export function concurrenceCondition(
  concurrenceKey: string,
  minApprovals: number,
  overrides: Partial<AuthorityCondition> = {},
): AuthorityCondition {
  return createTestCondition({
    conditionType: AuthorityConditionType.REQUIRED_CONCURRENCE,
    configuration: { concurrenceKey, minApprovals },
    ...overrides,
  });
}

export function asGovernmentAction(action: GovernmentActionType): GovernmentAction {
  return action;
}
