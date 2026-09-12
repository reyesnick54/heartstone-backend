import { ApplicationCaseWorkflowStage } from '@prisma/client';

export const ALLOWED_CASE_WORKFLOW_TRANSITIONS: Record<
  ApplicationCaseWorkflowStage,
  readonly ApplicationCaseWorkflowStage[]
> = {
  [ApplicationCaseWorkflowStage.SUBMITTED]: [ApplicationCaseWorkflowStage.COMPLETENESS_REVIEW],
  [ApplicationCaseWorkflowStage.COMPLETENESS_REVIEW]: [
    ApplicationCaseWorkflowStage.INCOMPLETE,
    ApplicationCaseWorkflowStage.ADMINISTRATIVELY_COMPLETE,
    ApplicationCaseWorkflowStage.SAFE_HALTED,
  ],
  [ApplicationCaseWorkflowStage.INCOMPLETE]: [ApplicationCaseWorkflowStage.WAITING_APPLICANT],
  [ApplicationCaseWorkflowStage.WAITING_APPLICANT]: [
    ApplicationCaseWorkflowStage.RESUBMITTED,
    ApplicationCaseWorkflowStage.SAFE_HALTED,
  ],
  [ApplicationCaseWorkflowStage.RESUBMITTED]: [ApplicationCaseWorkflowStage.COMPLETENESS_REVIEW],
  [ApplicationCaseWorkflowStage.ADMINISTRATIVELY_COMPLETE]: [
    ApplicationCaseWorkflowStage.SUBSTANTIVE_REVIEW,
  ],
  [ApplicationCaseWorkflowStage.SUBSTANTIVE_REVIEW]: [ApplicationCaseWorkflowStage.SAFE_HALTED],
  [ApplicationCaseWorkflowStage.SAFE_HALTED]: [],
};
