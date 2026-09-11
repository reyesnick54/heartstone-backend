import {
  type AuthorityEvaluationResult,
  type AuthorityRevalidationState,
} from '@prisma/client';

import { type AuthorityReasonCode } from './authority.constants';

export interface GoverningSourceReference {
  sourceId: string;
  code: string;
  version: string;
  status: string;
  isControlling: boolean;
}

export interface ConditionEvaluation {
  code: string;
  description: string;
  satisfied: boolean;
}

export interface DependencyOutcome {
  code: string;
  description: string;
  satisfied: boolean;
  mandatory: boolean;
}

export interface EffectiveAuthorityState {
  functionStatus: string;
  assignmentRevalidationState: AuthorityRevalidationState;
  appointmentCurrent: boolean | null;
  delegationCurrent: boolean | null;
  governingSourcesAuthenticated: boolean;
}

export interface EvaluationReplaySnapshot {
  evaluatedAt: string;
  actorIdentityId: string | null;
  officeholderId: string | null;
  functionId: string;
  functionCode: string;
  requestedAction: string;
  assignmentId: string | null;
  appointmentId: string | null;
  delegationId: string | null;
  governingSourceRefs: GoverningSourceReference[];
  conditionsEvaluated: ConditionEvaluation[];
  dependencyOutcomes: DependencyOutcome[];
  effectiveAuthorityState: EffectiveAuthorityState;
  reasonCodes: AuthorityReasonCode[];
  result: AuthorityEvaluationResult;
  engineVersion: string;
  rulesetVersion: string;
}

export interface AuthorityEvaluationRequest {
  actorIdentityId?: string;
  officeholderId?: string;
  functionCode: string;
  requestedAction: string;
  assignmentId?: string;
  appointmentId?: string;
  delegationId?: string;
  correlationId?: string;
  contextReference?: string;
  evaluatedAt?: Date;
}

export interface AuthorityEvaluationOutcome {
  recordId: string;
  result: AuthorityEvaluationResult;
  reasonCodes: AuthorityReasonCode[];
  evaluatedAt: Date;
}

export interface StructuredExplanationItem {
  kind: string;
  code: string;
  statement: string;
  reference?: string;
}

export interface StructuredExplanation {
  evaluationId: string;
  result: AuthorityEvaluationResult;
  items: StructuredExplanationItem[];
}

export interface ReplayOutcome {
  mode: string;
  evaluationId: string;
  historicalResult: AuthorityEvaluationResult;
  replayResult: AuthorityEvaluationResult;
  differsFromHistorical: boolean;
  explanation: StructuredExplanation;
  governingSourcesConsidered: GoverningSourceReference[];
}
