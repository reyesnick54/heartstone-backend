import { Injectable, NotFoundException } from '@nestjs/common';
import { PerformanceClaimCategory, PerformanceClaimReviewStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface CreatePerformanceClaimInput {
  claimReference: string;
  category: PerformanceClaimCategory;
  assertedValue: Prisma.InputJsonValue;
  assertedByIdentityId: string;
  attributionMetadata: Prisma.InputJsonValue;
  externalFactorNotes?: string;
  isApplicantAssertion?: boolean;
}

export interface ReviewPerformanceClaimInput {
  claimId: string;
  reviewStatus: PerformanceClaimReviewStatus;
  humanReviewedByIdentityId: string;
  independentVerificationRefs?: Prisma.InputJsonValue;
  isPublic?: boolean;
}

@Injectable()
export class PerformanceClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async createClaim(input: CreatePerformanceClaimInput) {
    this.boundary.assertAttributionMetadataPresent(
      input.attributionMetadata as Record<string, unknown>,
    );

    return this.prisma.performanceClaim.create({
      data: {
        claimReference: input.claimReference,
        category: input.category,
        assertedValue: input.assertedValue,
        assertedByIdentityId: input.assertedByIdentityId,
        attributionMetadata: input.attributionMetadata,
        externalFactorNotes: input.externalFactorNotes,
        isApplicantAssertion: input.isApplicantAssertion ?? true,
        requiresClaimReview: true,
        reviewStatus: PerformanceClaimReviewStatus.DRAFT,
      },
    });
  }

  async reviewClaim(input: ReviewPerformanceClaimInput) {
    const claim = await this.prisma.performanceClaim.findUnique({
      where: { id: input.claimId },
    });

    if (!claim) {
      throw new NotFoundException(`PerformanceClaim ${input.claimId} not found`);
    }

    const verificationRefs = Array.isArray(input.independentVerificationRefs)
      ? input.independentVerificationRefs
      : claim.independentVerificationRefs;

    this.boundary.assertApplicantAssertionRequiresIndependentVerification({
      isApplicantAssertion: claim.isApplicantAssertion,
      independentVerificationRefs: verificationRefs as unknown[],
      targetReviewStatus: input.reviewStatus,
    });

    if (input.isPublic) {
      this.boundary.assertPublicEconomicClaimRequiresReview(input.reviewStatus);
    }

    return this.prisma.performanceClaim.update({
      where: { id: input.claimId },
      data: {
        reviewStatus: input.reviewStatus,
        humanReviewedAt: new Date(),
        humanReviewedByIdentityId: input.humanReviewedByIdentityId,
        independentVerificationRefs: verificationRefs as Prisma.InputJsonValue,
        isPublic: input.isPublic ?? claim.isPublic,
      },
    });
  }

  async getClaim(claimId: string) {
    const claim = await this.prisma.performanceClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new NotFoundException(`PerformanceClaim ${claimId} not found`);
    }

    return claim;
  }
}
