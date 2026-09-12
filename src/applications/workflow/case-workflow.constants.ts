import { CaseWorkflowStage } from '@prisma/client';

export const ALLOWED_CASE_WORKFLOW_TRANSITIONS: Record<
  CaseWorkflowStage,
  readonly CaseWorkflowStage[]
> = {
  [CaseWorkflowStage.SUBMITTED]: [CaseWorkflowStage.COMPLETENESS_REVIEW],
  [CaseWorkflowStage.COMPLETENESS_REVIEW]: [
    CaseWorkflowStage.INCOMPLETE,
    CaseWorkflowStage.ADMINISTRATIVELY_COMPLETE,
    CaseWorkflowStage.SAFE_HALTED,
  ],
  [CaseWorkflowStage.INCOMPLETE]: [CaseWorkflowStage.WAITING_APPLICANT],
  [CaseWorkflowStage.WAITING_APPLICANT]: [
    CaseWorkflowStage.RESUBMITTED,
    CaseWorkflowStage.SAFE_HALTED,
  ],
  [CaseWorkflowStage.RESUBMITTED]: [CaseWorkflowStage.COMPLETENESS_REVIEW],
  [CaseWorkflowStage.ADMINISTRATIVELY_COMPLETE]: [CaseWorkflowStage.SUBSTANTIVE_REVIEW],
  [CaseWorkflowStage.SUBSTANTIVE_REVIEW]: [CaseWorkflowStage.SAFE_HALTED],
  [CaseWorkflowStage.SAFE_HALTED]: [],
};
