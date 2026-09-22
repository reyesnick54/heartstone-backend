import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';
import { SOCIAL_PROTECTION_APPEAL_PREFIX } from '../social-protection.constants';

@Injectable()
export class SocialProtectionAppealReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async linkAppealReference(input: {
    benefitAwardId: string;
    originalBenefitAwardVersionId: string;
    redressMatterId?: string;
    challengedGovernmentDecisionId?: string;
    preservesOriginalDecision?: boolean;
  }) {
    this.boundary.assertAppealPreservesOriginalDecision(input.preservesOriginalDecision ?? true);

    const award = await this.prisma.benefitAward.findUnique({
      where: { id: input.benefitAwardId },
    });
    if (!award) {
      throw new NotFoundException('Benefit award not found');
    }

    const version = await this.prisma.benefitAwardVersion.findUnique({
      where: { id: input.originalBenefitAwardVersionId },
    });
    if (version?.benefitAwardId !== input.benefitAwardId) {
      throw new NotFoundException('Original benefit award version not found for appeal linkage');
    }

    const appealReference = `${SOCIAL_PROTECTION_APPEAL_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const reference = await this.prisma.socialProtectionAppealReference.create({
      data: {
        id: randomUUID(),
        appealReference,
        benefitAwardId: input.benefitAwardId,
        redressMatterId: input.redressMatterId,
        originalBenefitAwardVersionId: input.originalBenefitAwardVersionId,
        challengedGovernmentDecisionId: input.challengedGovernmentDecisionId,
        preservesOriginalDecision: input.preservesOriginalDecision ?? true,
      },
    });

    return {
      reference,
      originalDecisionPreserved: reference.preservesOriginalDecision,
      originalBenefitAwardVersionId: reference.originalBenefitAwardVersionId,
    };
  }
}
