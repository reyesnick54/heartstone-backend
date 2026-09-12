import type { WorkflowStepType, WorkflowVersionStatus } from '@prisma/client';

export interface WorkflowDefinitionBody {
  id: string;
}

export interface WorkflowVersionBody {
  id: string;
  version: string;
  status: WorkflowVersionStatus;
  supersededByVersionId?: string | null;
}

export interface WorkflowStageBody {
  id: string;
  stageKey: string;
  stageType: string;
}

export interface WorkflowStepBody {
  id: string;
  stepKey: string;
  stepType: WorkflowStepType;
}

export interface WorkflowValidationResultBody {
  valid: boolean;
  issues: { code: string; message: string }[];
}

export interface WorkflowReconstructBody {
  version: string;
  steps: unknown[];
  transitions: unknown[];
}

export function asWorkflowDefinitionBody(body: unknown): WorkflowDefinitionBody {
  return body as WorkflowDefinitionBody;
}

export function asWorkflowVersionBody(body: unknown): WorkflowVersionBody {
  return body as WorkflowVersionBody;
}

export function asWorkflowStageBody(body: unknown): WorkflowStageBody {
  return body as WorkflowStageBody;
}

export function asWorkflowStepBody(body: unknown): WorkflowStepBody {
  return body as WorkflowStepBody;
}

export function asWorkflowValidationResultBody(body: unknown): WorkflowValidationResultBody {
  return body as WorkflowValidationResultBody;
}

export function asWorkflowReconstructBody(body: unknown): WorkflowReconstructBody {
  return body as WorkflowReconstructBody;
}

export function asWorkflowStageListBody(body: unknown): WorkflowStageBody[] {
  return body as WorkflowStageBody[];
}

export function asWorkflowStepListBody(body: unknown): WorkflowStepBody[] {
  return body as WorkflowStepBody[];
}

export function asWorkflowVersionListBody(body: unknown): WorkflowVersionBody[] {
  return body as WorkflowVersionBody[];
}
