import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  DigitalAssetsActorPersona,
  DigitalAssetsTechnicalReviewCategory,
  DigitalAssetsTechnicalReviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DigitalAssetsBoundaryService } from '../common/digital-assets-boundary.service';

@Injectable()
export class DigitalAssetsTechnicalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: DigitalAssetsBoundaryService,
  ) {}

  async openReview(input: {
    regulatedEntityId: string;
    reviewCategory: DigitalAssetsTechnicalReviewCategory;
    configuredCategoryCode?: string;
    evidenceRecordId?: string;
  }) {
    return this.prisma.digitalAssetsTechnicalReviewRecord.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        reviewCategory: input.reviewCategory,
        configuredCategoryCode: input.configuredCategoryCode,
        evidenceRecordId: input.evidenceRecordId,
        status: DigitalAssetsTechnicalReviewStatus.PENDING,
        isOfficialApproval: false,
      },
    });
  }

  async recordReviewerNotes(input: {
    technicalReviewId: string;
    reviewerIdentityId?: string;
    reviewerPersona: DigitalAssetsActorPersona;
    summaryNotes: string;
    status: DigitalAssetsTechnicalReviewStatus;
    markOfficialApproval?: boolean;
  }) {
    this.boundary.assertAiCannotApproveAuthorization(
      input.reviewerPersona,
      'FINALIZE_REGULATORY_DECISION',
    );
    this.boundary.assertTechnicalReviewIsNotAutonomousApproval(Boolean(input.markOfficialApproval));

    return this.prisma.digitalAssetsTechnicalReviewRecord.update({
      where: { id: input.technicalReviewId },
      data: {
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerPersona: input.reviewerPersona,
        summaryNotes: input.summaryNotes,
        status: input.status,
        isOfficialApproval: false,
      },
    });
  }
}
