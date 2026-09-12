import {
  type ApplicationCaseCompletenessReviewItemStatus,
  type ApplicationCaseCompletenessReviewStatus,
} from '@prisma/client';

export interface CompletenessReviewerContext {
  identityId: string;
  officeholderId?: string;
  functionAuthorityRecordId: string;
  isAiAssisted?: boolean;
  requiresHumanReview?: boolean;
}

export interface CompletenessItemAssessment {
  checklistItemCode: string;
  status: ApplicationCaseCompletenessReviewItemStatus;
  reviewerNotes?: string;
}

export interface FinalizeCompletenessReviewResult {
  reviewId: string;
  status: ApplicationCaseCompletenessReviewStatus;
  authorityEvaluationRecordId?: string;
  administrativelyComplete: boolean;
  isApproval: false;
  explanationCodes: string[];
}
