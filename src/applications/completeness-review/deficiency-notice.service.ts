import { Injectable } from '@nestjs/common';
import {
  type ApplicationCaseCompletenessReviewItem,
  ApplicationCaseDeficiencyNoticeStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { APPLICATIONS_EXPLANATION_CODES } from '../applications.constants';

export interface IssueDeficiencyNoticeInput {
  reference: string;
  caseId: string;
  applicationSubmissionId: string;
  completenessReviewId: string;
  requiredApplicantAction: string;
  responseDeadline: Date;
  departmentContactReference: string;
  issuedByIdentityId: string;
  issuedByOfficeholderId?: string;
  deficientItems: ApplicationCaseCompletenessReviewItem[];
}

@Injectable()
export class DeficiencyNoticeService {
  constructor(private readonly prisma: PrismaService) {}

  async issueNotice(input: IssueDeficiencyNoticeInput) {
    const issuedAt = new Date();

    const notice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.applicationCaseDeficiencyNotice.create({
        data: {
          reference: input.reference,
          caseId: input.caseId,
          applicationSubmissionId: input.applicationSubmissionId,
          completenessReviewId: input.completenessReviewId,
          requiredApplicantAction: input.requiredApplicantAction,
          responseDeadline: input.responseDeadline,
          departmentContactReference: input.departmentContactReference,
          issuedByIdentityId: input.issuedByIdentityId,
          issuedByOfficeholderId: input.issuedByOfficeholderId,
          issuedAt,
          status: ApplicationCaseDeficiencyNoticeStatus.ISSUED,
          isProceduralNotice: true,
          items: {
            create: input.deficientItems.map((item) => ({
              completenessReviewItemId: item.id,
              checklistItemCode: item.checklistItemCode,
              deficiencyDescription:
                item.reviewerNotes ?? `Administrative deficiency: ${item.label}`,
              requiredAction: `Provide or correct: ${item.label}`,
            })),
          },
        },
        include: { items: true },
      });

      await tx.applicationCaseInformationRequest.create({
        data: {
          caseId: input.caseId,
          deficiencyNoticeId: created.id,
          originalSubmissionId: input.applicationSubmissionId,
          responseDeadline: input.responseDeadline,
        },
      });

      return created;
    });

    return {
      ...notice,
      isRefusal: false,
      explanationCode: APPLICATIONS_EXPLANATION_CODES.DEFICIENCY_NOTICE_IS_PROCEDURAL,
    };
  }
}
