import { Injectable } from '@nestjs/common';
import { ApplicationCaseWorkflowStage } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { buildServiceConfigurationFingerprint } from '../../service-catalog/common/service-configuration-hash.util';
import { ApplicationSubmissionService } from '../submissions/application-submission.service';
import { CaseWorkflowService } from '../workflow/case-workflow.service';

export interface OpenApplicationCaseInput {
  governmentServiceId: string;
  governmentServiceVersionId: string;
  applicantIdentityId: string;
  formVersionId?: string | null;
  answers: Record<string, unknown>;
  caseReferencePrefix?: string;
}

@Injectable()
export class ApplicationCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: ApplicationSubmissionService,
    private readonly workflowService: CaseWorkflowService,
  ) {}

  async openCaseWithInitialSubmission(input: OpenApplicationCaseInput) {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: input.governmentServiceVersionId },
      include: {
        checklistItems: true,
        fees: true,
        eligibilityRules: true,
      },
    });

    if (version?.governmentServiceId !== input.governmentServiceId) {
      throw new Error('Government service version does not belong to the specified service');
    }

    const configurationFingerprint = buildServiceConfigurationFingerprint({
      serviceVersionId: version.id,
      formVersionId: input.formVersionId ?? version.formVersionId,
      feeDefinitionIds: version.fees.map((fee) => fee.id),
      eligibilityRuleIds: version.eligibilityRules.map((rule) => rule.id),
      checklistItemIds: version.checklistItems.map((item) => item.id),
    });

    const caseReference = `${input.caseReferencePrefix ?? 'CASE'}-${String(Date.now())}`;

    const caseRecord = await this.prisma.applicationCase.create({
      data: {
        caseReference,
        governmentServiceId: input.governmentServiceId,
        governmentServiceVersionId: version.id,
        configurationFingerprint,
        applicantIdentityId: input.applicantIdentityId,
        currentWorkflowStage: ApplicationCaseWorkflowStage.SUBMITTED,
      },
    });

    const submission = await this.submissionService.createSubmission({
      caseId: caseRecord.id,
      governmentServiceVersionId: version.id,
      formVersionId: input.formVersionId ?? version.formVersionId,
      answers: input.answers,
      submittedByIdentityId: input.applicantIdentityId,
    });

    await this.workflowService.transition({
      caseId: caseRecord.id,
      toStage: ApplicationCaseWorkflowStage.COMPLETENESS_REVIEW,
      actorIdentityId: input.applicantIdentityId,
      reason: 'Initial submission received; entering completeness review',
    });

    return { caseRecord, submission };
  }

  async getCase(id: string) {
    return this.prisma.applicationCase.findUniqueOrThrow({
      where: { id },
      include: {
        submissions: { orderBy: { submissionSequence: 'asc' } },
        completenessReviews: { orderBy: { reviewSequence: 'asc' } },
      },
    });
  }
}
