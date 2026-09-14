import { Injectable, NotFoundException } from '@nestjs/common';
import { RedressMatterStatus, RedressReviewType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface OpenInternalReviewInput {
  matterId: string;
  reviewType?: RedressReviewType;
  independenceRequired?: boolean;
}

@Injectable()
export class InternalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async openReview(input: OpenInternalReviewInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'internal administrative review');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    const review = await this.prisma.internalAdministrativeReview.create({
      data: {
        matterId: input.matterId,
        reviewType: input.reviewType ?? RedressReviewType.INTERNAL_ADMINISTRATIVE_REVIEW,
        independenceRequired: input.independenceRequired ?? true,
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.REVIEW },
    });

    return review;
  }
}
