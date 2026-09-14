import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AcceptanceDossierVersionStatus,
  AcceptanceReviewClass,
  AcceptanceReviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ConfigureReviewsInput {
  dossierVersionId: string;
  applicableReviewClasses: AcceptanceReviewClass[];
}

export interface RecordReviewInput {
  dossierVersionId: string;
  reviewClass: AcceptanceReviewClass;
  status: AcceptanceReviewStatus;
  reviewerIdentityId?: string;
  findings?: string;
}

@Injectable()
export class AcceptanceReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async configureApplicableReviews(input: ConfigureReviewsInput) {
    await this.assertMutableVersion(input.dossierVersionId);

    const created = [];
    for (const reviewClass of input.applicableReviewClasses) {
      const review = await this.prisma.acceptanceReview.upsert({
        where: {
          dossierVersionId_reviewClass: {
            dossierVersionId: input.dossierVersionId,
            reviewClass,
          },
        },
        create: {
          dossierVersionId: input.dossierVersionId,
          reviewClass,
          status: AcceptanceReviewStatus.PENDING,
        },
        update: {},
      });
      created.push(review);
    }
    return created;
  }

  async recordReview(input: RecordReviewInput) {
    await this.assertMutableVersion(input.dossierVersionId);

    const review = await this.prisma.acceptanceReview.findUnique({
      where: {
        dossierVersionId_reviewClass: {
          dossierVersionId: input.dossierVersionId,
          reviewClass: input.reviewClass,
        },
      },
    });

    if (!review) {
      throw new NotFoundException(
        `Review class ${input.reviewClass} is not configured for this dossier version`,
      );
    }

    return this.prisma.acceptanceReview.update({
      where: { id: review.id },
      data: {
        status: input.status,
        reviewerIdentityId: input.reviewerIdentityId,
        findings: input.findings,
        reviewedAt: new Date(),
      },
    });
  }

  async assertRequiredReviewsSatisfactory(dossierVersionId: string) {
    const reviews = await this.prisma.acceptanceReview.findMany({
      where: { dossierVersionId },
    });

    const deficient = reviews.filter(
      (review) => review.status !== AcceptanceReviewStatus.SATISFACTORY,
    );

    if (deficient.length > 0) {
      throw new BadRequestException(
        `Required acceptance reviews are not satisfactory: ${deficient.map((r) => r.reviewClass).join(', ')}`,
      );
    }
  }

  private async assertMutableVersion(dossierVersionId: string) {
    const version = await this.prisma.acceptanceDossierVersion.findUnique({
      where: { id: dossierVersionId },
    });
    if (!version) {
      throw new NotFoundException(`AcceptanceDossierVersion ${dossierVersionId} not found`);
    }
    if (
      version.status === AcceptanceDossierVersionStatus.SUBMITTED_FOR_FINAL_ACCEPTANCE ||
      version.status === AcceptanceDossierVersionStatus.FROZEN_ACCEPTED
    ) {
      throw new BadRequestException('Signed dossier version is immutable');
    }
  }
}
