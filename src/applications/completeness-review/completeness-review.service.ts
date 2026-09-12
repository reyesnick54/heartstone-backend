import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseWorkflowStage,
  CompletenessReviewItemStatus,
  CompletenessReviewStatus,
  IdentityType,
  Prisma,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { APPLICATIONS_EXPLANATION_CODES } from '../applications.constants';
import { COMPLETENESS_REVIEW_NOTIFICATION_EVENTS } from '../applications.constants';
import { buildChecklistConfigurationFingerprint } from '../common/checklist-pinning.util';
import { CaseWorkflowService } from '../workflow/case-workflow.service';
import {
  type CompletenessItemAssessment,
  type CompletenessReviewerContext,
  type FinalizeCompletenessReviewResult,
} from './completeness-review.types';
import { DeficiencyNoticeService } from './deficiency-notice.service';

const DEFICIENT_ITEM_STATUSES: CompletenessReviewItemStatus[] = [
  CompletenessReviewItemStatus.MISSING,
  CompletenessReviewItemStatus.ILLEGIBLE,
  CompletenessReviewItemStatus.CORRUPTED,
  CompletenessReviewItemStatus.APPARENTLY_INCONSISTENT,
  CompletenessReviewItemStatus.SUBSTITUTION_PENDING,
];

const SATISFIED_ITEM_STATUSES: CompletenessReviewItemStatus[] = [
  CompletenessReviewItemStatus.PRESENT,
  CompletenessReviewItemStatus.NOT_APPLICABLE,
];

@Injectable()
export class CompletenessReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly workflowService: CaseWorkflowService,
    private readonly deficiencyNoticeService: DeficiencyNoticeService,
  ) {}

  async startReview(input: {
    caseId: string;
    applicationSubmissionId: string;
    reviewer: CompletenessReviewerContext;
  }) {
    const submission = await this.prisma.applicationSubmission.findUnique({
      where: { id: input.applicationSubmissionId },
      include: {
        case: true,
      },
    });

    if (submission?.caseId !== input.caseId) {
      throw new NotFoundException('Application submission not found for case');
    }

    const checklistItems = await this.loadPinnedChecklistItems(submission);
    const checklistFingerprint = buildChecklistConfigurationFingerprint(
      submission.governmentServiceVersionId,
      checklistItems,
    );

    const priorReviewCount = await this.prisma.completenessReview.count({
      where: { caseId: input.caseId },
    });

    const review = await this.prisma.completenessReview.create({
      data: {
        caseId: input.caseId,
        applicationSubmissionId: submission.id,
        governmentServiceVersionId: submission.governmentServiceVersionId,
        checklistConfigurationFingerprint: checklistFingerprint,
        reviewerIdentityId: input.reviewer.identityId,
        reviewerOfficeholderId: input.reviewer.officeholderId,
        status: CompletenessReviewStatus.IN_REVIEW,
        reviewSequence: priorReviewCount + 1,
        startedAt: new Date(),
        items: {
          create: checklistItems.map((item) => ({
            checklistItemId: item.id,
            checklistItemCode: item.itemCode,
            label: item.label,
            isRequired: item.isRequired,
            status: CompletenessReviewItemStatus.UNRESOLVED,
          })),
        },
      },
      include: { items: true },
    });

    return review;
  }

  async assessItems(reviewId: string, assessments: CompletenessItemAssessment[]) {
    const review = await this.getReview(reviewId);

    if (this.isFinalized(review.status)) {
      throw new BadRequestException({
        message: 'Completeness review is already finalized',
        code: APPLICATIONS_EXPLANATION_CODES.REVIEW_ALREADY_FINALIZED,
      });
    }

    const pinnedCodes = new Set(review.items.map((item) => item.checklistItemCode));

    for (const assessment of assessments) {
      if (!pinnedCodes.has(assessment.checklistItemCode)) {
        throw new BadRequestException({
          message: `Checklist item "${assessment.checklistItemCode}" is not part of the pinned configuration`,
          code: APPLICATIONS_EXPLANATION_CODES.UNDISCLOSED_REQUIREMENT,
        });
      }

      if ((assessment.status as string) === 'VERIFIED') {
        throw new BadRequestException({
          message: 'VERIFIED is not a valid completeness item status',
          code: APPLICATIONS_EXPLANATION_CODES.UNDISCLOSED_REQUIREMENT,
        });
      }

      await this.prisma.completenessReviewItem.updateMany({
        where: {
          completenessReviewId: reviewId,
          checklistItemCode: assessment.checklistItemCode,
        },
        data: {
          status: assessment.status,
          reviewerNotes: assessment.reviewerNotes,
        },
      });
    }

    return this.getReview(reviewId);
  }

  async finalizeReview(
    reviewId: string,
    reviewer: CompletenessReviewerContext,
  ): Promise<FinalizeCompletenessReviewResult> {
    const review = await this.getReview(reviewId);

    if (this.isFinalized(review.status)) {
      throw new BadRequestException({
        message: 'Completeness review is already finalized',
        code: APPLICATIONS_EXPLANATION_CODES.REVIEW_ALREADY_FINALIZED,
      });
    }

    const explanationCodes: string[] = [];

    if (reviewer.isAiAssisted && reviewer.requiresHumanReview) {
      throw new ForbiddenException({
        message: 'AI-assisted actors cannot independently finalize consequential completeness review',
        code: APPLICATIONS_EXPLANATION_CODES.AI_CANNOT_FINALIZE_CONSEQUENTIAL_REVIEW,
      });
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: reviewer.identityId,
      functionAuthorityRecordId: reviewer.functionAuthorityRecordId,
      action: AuthorityActionType.REVIEW,
      officeholderId: reviewer.officeholderId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException({
        message: 'Reviewer is not authorized to finalize completeness review',
        code: APPLICATIONS_EXPLANATION_CODES.UNAUTHORIZED_COMPLETENESS_FINALIZATION,
        authorityEvaluationRecordId: authorityResult.evaluationId,
      });
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: reviewer.identityId },
    });

    if (identity?.type !== IdentityType.INDIVIDUAL) {
      throw new ForbiddenException({
        message: 'Completeness finalization requires an individual human reviewer identity',
        code: APPLICATIONS_EXPLANATION_CODES.UNAUTHORIZED_COMPLETENESS_FINALIZATION,
      });
    }

    const unresolvedRequired = review.items.filter(
      (item) => item.isRequired && item.status === CompletenessReviewItemStatus.UNRESOLVED,
    );

    if (unresolvedRequired.length > 0) {
      throw new BadRequestException({
        message: 'All required checklist items must be assessed before finalization',
        code: APPLICATIONS_EXPLANATION_CODES.UNDISCLOSED_REQUIREMENT,
      });
    }

    const deficientRequired = review.items.filter(
      (item) => item.isRequired && DEFICIENT_ITEM_STATUSES.includes(item.status),
    );

    const finalStatus =
      deficientRequired.length > 0
        ? CompletenessReviewStatus.INCOMPLETE
        : CompletenessReviewStatus.COMPLETE;

    const completedAt = new Date();

    await this.prisma.completenessReview.update({
      where: { id: reviewId },
      data: {
        status: finalStatus,
        completedAt,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        reviewerIdentityId: reviewer.identityId,
        reviewerOfficeholderId: reviewer.officeholderId,
      },
    });

    if (finalStatus === CompletenessReviewStatus.INCOMPLETE) {
      explanationCodes.push(APPLICATIONS_EXPLANATION_CODES.DEFICIENCY_NOTICE_IS_PROCEDURAL);

      await this.workflowService.transition({
        caseId: review.caseId,
        toStage: CaseWorkflowStage.INCOMPLETE,
        actorIdentityId: reviewer.identityId,
        reason: 'Completeness review found administrative deficiencies',
      });

      await this.workflowService.transition({
        caseId: review.caseId,
        toStage: CaseWorkflowStage.WAITING_APPLICANT,
        actorIdentityId: reviewer.identityId,
        reason: 'Awaiting applicant correction after deficiency notice',
      });
    } else {
      explanationCodes.push(APPLICATIONS_EXPLANATION_CODES.ADMINISTRATIVE_COMPLETENESS_NOT_APPROVAL);

      await this.workflowService.transition({
        caseId: review.caseId,
        toStage: CaseWorkflowStage.ADMINISTRATIVELY_COMPLETE,
        actorIdentityId: reviewer.identityId,
        reason: 'Administrative completeness achieved; not an approval',
      });

      await this.workflowService.transition({
        caseId: review.caseId,
        toStage: CaseWorkflowStage.SUBSTANTIVE_REVIEW,
        actorIdentityId: reviewer.identityId,
        reason: 'Routing to substantive review after administrative completeness',
      });

      await this.enqueueNotification(review.caseId, {
        eventType: COMPLETENESS_REVIEW_NOTIFICATION_EVENTS.COMPLETENESS_REVIEW_COMPLETE,
        reviewId,
        administrativelyComplete: true,
        isApproval: false,
      });
    }

    return {
      reviewId,
      status: finalStatus,
      authorityEvaluationRecordId: authorityResult.evaluationId,
      administrativelyComplete: finalStatus === CompletenessReviewStatus.COMPLETE,
      isApproval: false,
      explanationCodes,
    };
  }

  async issueDeficiencyNoticeForReview(
    reviewId: string,
    input: {
      reference: string;
      requiredApplicantAction: string;
      responseDeadline: Date;
      departmentContactReference: string;
      issuedByIdentityId: string;
      issuedByOfficeholderId?: string;
    },
  ) {
    const review = await this.getReview(reviewId);

    if (review.status !== CompletenessReviewStatus.INCOMPLETE) {
      throw new BadRequestException('Deficiency notice requires an INCOMPLETE completeness review');
    }

    const deficientItems = review.items.filter(
      (item) => item.isRequired && DEFICIENT_ITEM_STATUSES.includes(item.status),
    );

    const notice = await this.deficiencyNoticeService.issueNotice({
      reference: input.reference,
      caseId: review.caseId,
      applicationSubmissionId: review.applicationSubmissionId,
      completenessReviewId: review.id,
      requiredApplicantAction: input.requiredApplicantAction,
      responseDeadline: input.responseDeadline,
      departmentContactReference: input.departmentContactReference,
      issuedByIdentityId: input.issuedByIdentityId,
      issuedByOfficeholderId: input.issuedByOfficeholderId,
      deficientItems,
    });

    await this.enqueueNotification(review.caseId, {
      eventType: COMPLETENESS_REVIEW_NOTIFICATION_EVENTS.DEFICIENCY_NOTICE_ISSUED,
      deficiencyNoticeId: notice.id,
      isProceduralNotice: true,
      isRefusal: false,
    });

    return notice;
  }

  determineCompletenessFromItems(
    items: { isRequired: boolean; status: CompletenessReviewItemStatus }[],
  ): CompletenessReviewStatus {
    const hasUnresolvedRequired = items.some(
      (item) =>
        item.isRequired && item.status === CompletenessReviewItemStatus.UNRESOLVED,
    );

    if (hasUnresolvedRequired) {
      return CompletenessReviewStatus.UNRESOLVED;
    }

    const hasDeficientRequired = items.some(
      (item) => item.isRequired && DEFICIENT_ITEM_STATUSES.includes(item.status),
    );

    if (hasDeficientRequired) {
      return CompletenessReviewStatus.INCOMPLETE;
    }

    const allRequiredSatisfied = items
      .filter((item) => item.isRequired)
      .every((item) => SATISFIED_ITEM_STATUSES.includes(item.status));

    return allRequiredSatisfied
      ? CompletenessReviewStatus.COMPLETE
      : CompletenessReviewStatus.UNRESOLVED;
  }

  private async getReview(reviewId: string) {
    const review = await this.prisma.completenessReview.findUnique({
      where: { id: reviewId },
      include: { items: true },
    });

    if (!review) {
      throw new NotFoundException(`CompletenessReview "${reviewId}" was not found`);
    }

    return review;
  }

  private isFinalized(status: CompletenessReviewStatus): boolean {
    return (
      status === CompletenessReviewStatus.COMPLETE ||
      status === CompletenessReviewStatus.INCOMPLETE ||
      status === CompletenessReviewStatus.SAFE_HALTED
    );
  }

  private async loadPinnedChecklistItems(submission: {
    governmentServiceVersionId: string;
    pinnedChecklistItemIds: unknown;
  }) {
    const pinnedIds = submission.pinnedChecklistItemIds as string[];

    const items = await this.prisma.governmentServiceChecklistItem.findMany({
      where: {
        id: { in: pinnedIds },
        governmentServiceVersionId: submission.governmentServiceVersionId,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (items.length !== pinnedIds.length) {
      throw new BadRequestException({
        message: 'Pinned checklist configuration no longer matches submission snapshot',
        code: APPLICATIONS_EXPLANATION_CODES.CHECKLIST_VERSION_MISMATCH,
      });
    }

    return items.map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      label: item.label,
      isRequired: item.isRequired,
    }));
  }

  private async enqueueNotification(caseId: string, payload: Record<string, unknown>) {
    await this.prisma.applicationCaseNotificationOutbox.create({
      data: {
        caseId,
        eventType: String(payload.eventType),
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
