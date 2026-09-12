import type {
  CaseStatus,
  CaseWorkflowInstanceStatus,
  CaseWorkflowStepInstanceStatus,
} from '@prisma/client';

import { type WorkflowActorContext } from '../common/workflow-actor.types';

export interface StartWorkflowRequest {
  caseId: string;
  workflowVersionId: string;
  actor: WorkflowActorContext;
  at?: Date;
}

export interface StartWorkflowResult {
  instanceId: string;
  status: CaseWorkflowInstanceStatus;
  readyStepKeys: string[];
}

export interface StartStepRequest {
  instanceId: string;
  stepKey: string;
  parallelBranchKey?: string;
  actor: WorkflowActorContext;
  at?: Date;
}

export interface CompleteStepRequest {
  instanceId: string;
  stepKey: string;
  parallelBranchKey?: string;
  actor: WorkflowActorContext;
  idempotencyKey: string;
  reason?: string;
  notes?: string;
  at?: Date;
}

export interface CompleteStepResult {
  stepInstanceId: string;
  status: CaseWorkflowStepInstanceStatus;
  authorityEvaluationRecordId?: string;
  nextReadyStepKeys: string[];
  caseStatus?: CaseStatus;
  workflowStatus: CaseWorkflowInstanceStatus;
  alreadyCompleted: boolean;
}

export interface PauseWorkflowRequest {
  instanceId: string;
  actor: WorkflowActorContext;
  reason?: string;
  at?: Date;
}

export interface ResumeWorkflowRequest {
  instanceId: string;
  actor: WorkflowActorContext;
  at?: Date;
}

export interface ReturnForCorrectionRequest {
  instanceId: string;
  fromStepKey: string;
  toStepKey: string;
  actor: WorkflowActorContext;
  reason: string;
  at?: Date;
}

export interface EscalateWorkflowRequest {
  instanceId: string;
  fromStepKey: string;
  toStepKey: string;
  actor: WorkflowActorContext;
  reason: string;
  at?: Date;
}

export interface RecognizeDecisionResultRequest {
  instanceId: string;
  decisionReference: string;
  actor: WorkflowActorContext;
  at?: Date;
}

export interface SafeHaltRequest {
  instanceId: string;
  reason: string;
  actor?: WorkflowActorContext;
  at?: Date;
}

export interface CloseWorkflowRequest {
  instanceId: string;
  actor: WorkflowActorContext;
  reason?: string;
  at?: Date;
}
