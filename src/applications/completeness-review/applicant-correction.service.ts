import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicationCaseDeficiencyNoticeStatus,
  ApplicationCaseInformationRequestStatus,
  ApplicationCaseWorkflowStage,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { COMPLETENESS_REVIEW_NOTIFICATION_EVENTS } from '../applications.constants';
import { ApplicationSubmissionService } from '../submissions/application-submission.service';
import { CaseWorkflowService } from '../workflow/case-workflow.service';
import { CompletenessReviewService } from './completeness-review.service';

export interface SubmitApplicantCorrectionInput {
  caseId: string;
  deficiencyNoticeId: string;
  answers: Record<string, unknown>;
  applicantIdentityId: string;
  reviewer: {
    identityId: string;
    officeholderId?: string;
    functionAuthorityRecordId: string;
  };
}

@Injectable()
export class ApplicantCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly workflowService: CaseWorkflowService,
    private readonly completenessReviewService: CompletenessReviewService,
  ) {}

  async submitCorrection(input: SubmitApplicantCorrectionInput) {
    const notice = await this.prisma.applicationCaseDeficiencyNotice.findUnique({
      where: { id: input.deficiencyNoticeId },
      include: {
        applicantInformationRequests: true,
        applicationSubmission: true,
      },
    });

    if (notice?.caseId !== input.caseId) {
      throw new NotFoundException('Deficiency notice not found for case');
    }

    if (notice.status !== ApplicationCaseDeficiencyNoticeStatus.ISSUED) {
      throw new BadRequestException('Deficiency notice is not open for applicant response');
    }

    const originalSubmission = notice.applicationSubmission;

    const newSubmission = await this.submissionService.createSubmission({
      caseId: input.caseId,
      governmentServiceVersionId: originalSubmission.governmentServiceVersionId,
      formVersionId: originalSubmission.formVersionId,
      answers: input.answers,
      submittedByIdentityId: input.applicantIdentityId,
      priorSubmissionId: originalSubmission.id,
      triggeredByDeficiencyNoticeId: notice.id,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.applicationCaseDeficiencyNotice.update({
        where: { id: notice.id },
        data: { status: ApplicationCaseDeficiencyNoticeStatus.RESPONDED },
      });

      const infoRequest = notice.applicantInformationRequests[0];
      if (infoRequest) {
        await tx.applicationCaseInformationRequest.update({
          where: { id: infoRequest.id },
          data: {
            responseSubmissionId: newSubmission.id,
            status: ApplicationCaseInformationRequestStatus.RESPONDED,
          },
        });
      }

      await tx.applicationCaseNotificationOutbox.create({
        data: {
          caseId: input.caseId,
          eventType: COMPLETENESS_REVIEW_NOTIFICATION_EVENTS.APPLICANT_CORRECTION_RECEIVED,
          payload: {
            deficiencyNoticeId: notice.id,
            originalSubmissionId: originalSubmission.id,
            newSubmissionId: newSubmission.id,
          },
        },
      });
    });

    await this.workflowService.transition({
      caseId: input.caseId,
      toStage: ApplicationCaseWorkflowStage.RESUBMITTED,
      actorIdentityId: input.applicantIdentityId,
      reason: 'Applicant submitted correction in response to deficiency notice',
    });

    await this.workflowService.transition({
      caseId: input.caseId,
      toStage: ApplicationCaseWorkflowStage.COMPLETENESS_REVIEW,
      actorIdentityId: input.applicantIdentityId,
      reason: 'Re-entering completeness review after applicant correction',
    });

    const review = await this.completenessReviewService.startReview({
      caseId: input.caseId,
      applicationSubmissionId: newSubmission.id,
      reviewer: input.reviewer,
    });

    return {
      originalSubmission,
      newSubmission,
      review,
    };
  }
}
