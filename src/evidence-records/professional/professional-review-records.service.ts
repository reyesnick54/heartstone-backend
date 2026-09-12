import { Injectable } from '@nestjs/common';
import { ReviewRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { PROFESSIONAL_REVIEW_REFERENCE_PREFIX } from '../evidence-records.constants';

@Injectable()
export class ProfessionalReviewRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    masterAdministrativeFileId: string;
    externalAuthorityId?: string;
    reviewerReference?: string;
    findings?: string;
  }) {
    const review = await this.prisma.professionalReviewRecord.create({
      data: {
        reviewReference: generateEvidenceReferenceNumber(PROFESSIONAL_REVIEW_REFERENCE_PREFIX),
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        externalAuthorityId: input.externalAuthorityId,
        reviewerReference: input.reviewerReference,
        status: ReviewRecordStatus.IN_PROGRESS,
        findings: input.findings,
      },
    });

    return {
      ...review,
      isGovernmentDecision: false,
      disclaimer: 'Professional review does not constitute a government decision',
    };
  }

  async complete(reviewId: string, findings: string) {
    return this.prisma.professionalReviewRecord.update({
      where: { id: reviewId },
      data: {
        status: ReviewRecordStatus.COMPLETED,
        findings,
        completedAt: new Date(),
      },
    });
  }
}
