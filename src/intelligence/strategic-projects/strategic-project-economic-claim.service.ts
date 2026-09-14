import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PerformanceClaimReviewStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface LinkEconomicClaimInput {
  profileId: string;
  performanceClaimId: string;
  claimSummary?: string;
  isPublic?: boolean;
}

@Injectable()
export class StrategicProjectEconomicClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async linkEconomicClaim(input: LinkEconomicClaimInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    const performanceClaim = await this.prisma.performanceClaim.findUnique({
      where: { id: input.performanceClaimId },
    });

    if (!performanceClaim) {
      throw new NotFoundException(`PerformanceClaim ${input.performanceClaimId} not found`);
    }

    if (input.isPublic) {
      this.boundary.assertPublicEconomicClaimRequiresReview(performanceClaim.reviewStatus);
    }

    if (performanceClaim.reviewStatus === PerformanceClaimReviewStatus.DRAFT) {
      throw new BadRequestException(
        'Economic claims must use governed Phase 12A PerformanceClaim records; unreviewed claims cannot be linked',
      );
    }

    return this.prisma.strategicProjectEconomicClaim.create({
      data: {
        profileId: input.profileId,
        performanceClaimId: input.performanceClaimId,
        claimSummary: input.claimSummary,
      },
      include: { performanceClaim: true },
    });
  }
}
