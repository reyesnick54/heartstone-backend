import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CaseEventType,
  CaseMilestoneStatus,
  CaseMilestoneType,
  CaseStatus,
  CaseWorkflowInstanceStatus,
  CompletenessReviewOutcome,
  DeficiencyNoticeStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CaseEventsService } from '../cases/case-events.service';
import { CaseStatusService } from '../cases/case-status.service';
import { WorkflowRuntimeService } from '../workflow/workflow-runtime.service';

export interface RunCompletenessReviewInput {
  caseId: string;
  applicationSubmissionId: string;
  reviewerIdentityId: string;
  checklistResults: {
    itemCode: string;
    status: 'PRESENT' | 'MISSING' | 'NOT_APPLICABLE';
  }[];
  notes?: string;
}

@Injectable()
export class CompletenessReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseStatus: CaseStatusService,
    private readonly caseEvents: CaseEventsService,
    private readonly workflowRuntime: WorkflowRuntimeService,
  ) {}

  async runReview(input: RunCompletenessReviewInput) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: {
        application: true,
        workflowInstance: true,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    const checklistItems = await this.prisma.governmentServiceChecklistItem.findMany({
      where: { governmentServiceVersionId: caseRecord.governmentServiceVersionId },
    });

    const disclosedItemCodes = new Set(checklistItems.map((item) => item.itemCode));
    const undisclosed = input.checklistResults.filter(
      (result) => !disclosedItemCodes.has(result.itemCode),
    );

    if (undisclosed.length > 0) {
      throw new ForbiddenException('Undisclosed requirement cannot create deficiency');
    }

    const verifiedAttempt = input.checklistResults.some(
      (result) => (result as { status: string }).status === 'VERIFIED',
    );
    if (verifiedAttempt) {
      throw new ForbiddenException('PRESENT item cannot become VERIFIED evidence in Phase 6');
    }

    const missingItems = input.checklistResults.filter((result) => result.status === 'MISSING');
    const outcome =
      missingItems.length > 0
        ? CompletenessReviewOutcome.INCOMPLETE
        : CompletenessReviewOutcome.COMPLETE;

    const review = await this.prisma.completenessReview.create({
      data: {
        applicationSubmissionId: input.applicationSubmissionId,
        reviewerIdentityId: input.reviewerIdentityId,
        outcome,
        checklistResults: input.checklistResults,
        notes: input.notes,
        reviewedAt: new Date(),
      },
    });

    await this.caseEvents.record(
      input.caseId,
      CaseEventType.COMPLETENESS_REVIEW_COMPLETED,
      {
        reviewId: review.id,
        outcome,
      },
      input.reviewerIdentityId,
    );

    if (outcome === CompletenessReviewOutcome.INCOMPLETE) {
      await this.prisma.deficiencyNotice.create({
        data: {
          applicationSubmissionId: input.applicationSubmissionId,
          completenessReviewId: review.id,
          status: DeficiencyNoticeStatus.ISSUED,
          missingItems,
          instructions: 'Please provide the missing items listed and resubmit corrections.',
        },
      });

      await this.caseStatus.transition(
        input.caseId,
        CaseStatus.WAITING_APPLICANT,
        'Deficiency notice issued',
        input.reviewerIdentityId,
      );

      if (caseRecord.workflowInstance) {
        await this.prisma.caseWorkflowInstance.update({
          where: { id: caseRecord.workflowInstance.id },
          data: { status: CaseWorkflowInstanceStatus.WAITING_APPLICANT },
        });
      }

      await this.prisma.caseSlaClock.updateMany({
        where: { caseId: input.caseId, status: 'RUNNING' },
        data: { status: 'PAUSED', pausedAt: new Date() },
      });

      await this.caseEvents.record(
        input.caseId,
        CaseEventType.DEFICIENCY_ISSUED,
        {
          reviewId: review.id,
        },
        input.reviewerIdentityId,
      );

      return { review, outcome, deficiencyIssued: true };
    }

    await this.prisma.caseMilestone.create({
      data: {
        caseId: input.caseId,
        milestoneType: CaseMilestoneType.COMPLETENESS_COMPLETE,
        name: 'Completeness review complete',
        status: CaseMilestoneStatus.COMPLETED,
      },
    });

    await this.workflowRuntime.completeStep({
      caseId: input.caseId,
      stepKey: 'completeness-review',
      actorIdentityId: input.reviewerIdentityId,
      outcome: 'COMPLETE',
    });

    return { review, outcome, deficiencyIssued: false };
  }
}
