import { Injectable } from '@nestjs/common';
import { ServicePackReviewType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServicePackReviewChainService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveRequiredSteps(input: {
    institutionId: string;
    servicePackId: string;
  }): Promise<
    {
      sequenceOrder: number;
      reviewType: ServicePackReviewType;
      required: boolean;
      requiresAuthorityEvaluation: boolean;
      chainStepId?: string;
    }[]
  > {
    const packPolicy = await this.prisma.servicePackReviewChainPolicy.findFirst({
      where: { servicePackId: input.servicePackId, isActive: true },
      include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
    });
    if (packPolicy && packPolicy.steps.length > 0) {
      return packPolicy.steps.map((step) => ({
        sequenceOrder: step.sequenceOrder,
        reviewType: step.reviewType,
        required: step.required,
        requiresAuthorityEvaluation: step.requiresAuthorityEvaluation,
        chainStepId: step.id,
      }));
    }

    const institutionPolicy = await this.prisma.servicePackReviewChainPolicy.findFirst({
      where: { institutionId: input.institutionId, servicePackId: null, isActive: true },
      include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
    });
    if (institutionPolicy && institutionPolicy.steps.length > 0) {
      return institutionPolicy.steps.map((step) => ({
        sequenceOrder: step.sequenceOrder,
        reviewType: step.reviewType,
        required: step.required,
        requiresAuthorityEvaluation: step.requiresAuthorityEvaluation,
        chainStepId: step.id,
      }));
    }

    return [
      {
        sequenceOrder: 1,
        reviewType: ServicePackReviewType.TECHNICAL_ARCHITECTURE,
        required: true,
        requiresAuthorityEvaluation: false,
      },
      {
        sequenceOrder: 2,
        reviewType: ServicePackReviewType.SERVICE_OWNER,
        required: true,
        requiresAuthorityEvaluation: false,
      },
    ];
  }
}
