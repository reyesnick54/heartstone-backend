import { Injectable, NotFoundException } from '@nestjs/common';
import { ExternalReviewRouteType, ExternalReviewStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import { SILENCE_NOT_APPEAL_SUCCESS_MESSAGE } from '../redress.constants';
import { ExternalReviewReferralService } from './external-review-referral.service';

export interface CreateRegulatoryReviewReferralInput {
  redressMatterId: string;
  regulatorReference: string;
  competentAuthority: string;
  routeVersion: string;
  authorityPurpose: string;
  grounds: string;
  securityClassification: string;
  regulatoryMatterReference?: string;
  regulatorStatusText?: string;
  preparedByIdentityId?: string;
}

@Injectable()
export class RegulatoryReviewReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly referralService: ExternalReviewReferralService,
  ) {}

  async create(input: CreateRegulatoryReviewReferralInput) {
    this.boundary.assertSilenceIsNotSuccess({ inferredApprovalFromSilence: false });

    const referral = await this.referralService.create({
      redressMatterId: input.redressMatterId,
      routeType: ExternalReviewRouteType.REGULATORY_REVIEW,
      competentAuthority: input.competentAuthority,
      routeVersion: input.routeVersion,
      authorityPurpose: input.authorityPurpose,
      grounds: input.grounds,
      securityClassification: input.securityClassification,
      preparedByIdentityId: input.preparedByIdentityId,
      retainedAuthorityClass: undefined,
    });

    const regulatory = await this.prisma.regulatoryReviewReferral.create({
      data: {
        referralId: referral.id,
        redressMatterId: input.redressMatterId,
        regulatorReference: input.regulatorReference,
        regulatoryMatterReference: input.regulatoryMatterReference,
        regulatorStatusText: input.regulatorStatusText,
        inferredApprovalFromSilence: false,
        status: ExternalReviewStatus.PREPARATION,
      },
    });

    return {
      ...regulatory,
      referral,
      boundaryMessage: SILENCE_NOT_APPEAL_SUCCESS_MESSAGE,
    };
  }

  async recordRegulatorStatus(input: {
    referralId: string;
    regulatorStatusText: string;
    inferredApprovalFromSilence?: boolean;
  }) {
    this.boundary.assertSilenceIsNotSuccess({
      inferredApprovalFromSilence: input.inferredApprovalFromSilence,
    });

    const regulatory = await this.prisma.regulatoryReviewReferral.findUnique({
      where: { referralId: input.referralId },
    });

    if (!regulatory) {
      throw new NotFoundException('Regulatory review referral not found');
    }

    return this.prisma.regulatoryReviewReferral.update({
      where: { referralId: input.referralId },
      data: {
        regulatorStatusText: input.regulatorStatusText,
        inferredApprovalFromSilence: false,
      },
    });
  }
}
