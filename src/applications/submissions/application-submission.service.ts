import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { buildServiceConfigurationFingerprint } from '../../service-catalog/common/service-configuration-hash.util';
import { APPLICATIONS_EXPLANATION_CODES } from '../applications.constants';
import {
  buildChecklistConfigurationFingerprint,
  type PinnedChecklistItem,
} from '../common/checklist-pinning.util';

export interface CreateApplicationSubmissionInput {
  caseId: string;
  governmentServiceVersionId: string;
  formVersionId?: string | null;
  answers: Record<string, unknown>;
  submittedByIdentityId: string;
  priorSubmissionId?: string;
  triggeredByDeficiencyNoticeId?: string;
}

@Injectable()
export class ApplicationSubmissionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubmission(input: CreateApplicationSubmissionInput) {
    const caseRecord = await this.prisma.applicationCase.findUnique({
      where: { id: input.caseId },
      include: {
        submissions: {
          orderBy: { submissionSequence: 'desc' },
          take: 1,
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`ApplicationCase "${input.caseId}" was not found`);
    }

    if (caseRecord.governmentServiceVersionId !== input.governmentServiceVersionId) {
      throw new BadRequestException({
        message: 'Submission must use the case-pinned government service version',
        code: APPLICATIONS_EXPLANATION_CODES.CONFIGURATION_FINGERPRINT_MISMATCH,
      });
    }

    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: input.governmentServiceVersionId },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        fees: true,
        eligibilityRules: true,
      },
    });

    if (!version) {
      throw new NotFoundException(
        `GovernmentServiceVersion "${input.governmentServiceVersionId}" was not found`,
      );
    }

    const pinnedItems: PinnedChecklistItem[] = version.checklistItems.map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      label: item.label,
      isRequired: item.isRequired,
    }));

    const configurationFingerprint = buildServiceConfigurationFingerprint({
      serviceVersionId: version.id,
      formVersionId: input.formVersionId ?? version.formVersionId,
      feeDefinitionIds: version.fees.map((fee) => fee.id),
      eligibilityRuleIds: version.eligibilityRules.map((rule) => rule.id),
      checklistItemIds: pinnedItems.map((item) => item.id),
    });

    if (configurationFingerprint !== caseRecord.configurationFingerprint) {
      throw new BadRequestException({
        message: 'Newer checklist or configuration cannot silently alter an existing case',
        code: APPLICATIONS_EXPLANATION_CODES.NEWER_CHECKLIST_CANNOT_ALTER_EXISTING_CASE,
      });
    }

    const nextSequence = (caseRecord.submissions[0]?.submissionSequence ?? 0) + 1;
    const pinnedChecklistFingerprint = buildChecklistConfigurationFingerprint(
      version.id,
      pinnedItems,
    );

    return this.prisma.applicationCaseSubmission.create({
      data: {
        caseId: input.caseId,
        submissionSequence: nextSequence,
        governmentServiceVersionId: version.id,
        formVersionId: input.formVersionId ?? version.formVersionId,
        configurationFingerprint,
        pinnedChecklistItemIds: pinnedItems.map((item) => item.id),
        pinnedChecklistFingerprint,
        answers: input.answers as Prisma.InputJsonValue,
        submittedAt: new Date(),
        submittedByIdentityId: input.submittedByIdentityId,
        priorSubmissionId: input.priorSubmissionId,
        triggeredByDeficiencyNoticeId: input.triggeredByDeficiencyNoticeId,
      },
    });
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.applicationCaseSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`ApplicationSubmission "${id}" was not found`);
    }

    return submission;
  }

  assertSubmissionImmutable(submission: { id: string }): void {
    throw new BadRequestException({
      message: `ApplicationSubmission "${submission.id}" is immutable and cannot be modified`,
      code: APPLICATIONS_EXPLANATION_CODES.SUBMISSION_IMMUTABLE,
    });
  }
}
