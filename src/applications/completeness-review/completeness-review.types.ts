import { type CompletenessReviewItemStatus, type CompletenessReviewStatus } from '@prisma/client';

export interface CompletenessReviewerContext {
  identityId: string;
  officeholderId?: string;
  functionAuthorityRecordId: string;
  isAiAssisted?: boolean;
  requiresHumanReview?: boolean;
}

export interface CompletenessItemAssessment {
  checklistItemCode: string;
  status: CompletenessReviewItemStatus;
  reviewerNotes?: string;
}

export interface FinalizeCompletenessReviewResult {
  reviewId: string;
  status: CompletenessReviewStatus;
  authorityEvaluationRecordId?: string;
  administrativelyComplete: boolean;
  isApproval: false;
  explanationCodes: string[];
}
