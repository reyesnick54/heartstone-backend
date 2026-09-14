import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ExternalAuthorityBindingClass,
  ExternalReviewRouteType,
  ExternalReviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import { RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE } from '../redress.constants';
import { ExternalReviewReferralService } from './external-review-referral.service';

export interface CreateOmbudsOversightReferralInput {
  redressMatterId: string;
  ombudsReference: string;
  oversightPurpose: string;
  competentAuthority: string;
  routeVersion: string;
  authorityPurpose: string;
  grounds: string;
  securityClassification: string;
  bindingClass?: ExternalAuthorityBindingClass;
  preparedByIdentityId?: string;
}

@Injectable()
export class OmbudsOversightReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly referralService: ExternalReviewReferralService,
  ) {}

  async create(input: CreateOmbudsOversightReferralInput) {
    const bindingClass = input.bindingClass ?? ExternalAuthorityBindingClass.RECOMMENDATORY;
    this.boundary.assertRecommendationNotBindingUnlessAuthenticated({
      bindingClass,
      isAuthenticated: false,
      isRecommendatoryOnly: true,
    });

    const referral = await this.referralService.create({
      redressMatterId: input.redressMatterId,
      routeType: ExternalReviewRouteType.OMBUDS_OVERSIGHT,
      competentAuthority: input.competentAuthority,
      routeVersion: input.routeVersion,
      authorityPurpose: input.authorityPurpose,
      grounds: input.grounds,
      securityClassification: input.securityClassification,
      preparedByIdentityId: input.preparedByIdentityId,
    });

    const ombuds = await this.prisma.ombudsOversightReferral.create({
      data: {
        referralId: referral.id,
        redressMatterId: input.redressMatterId,
        ombudsReference: input.ombudsReference,
        oversightPurpose: input.oversightPurpose,
        bindingClass,
        isRecommendatoryOnly: true,
        status: ExternalReviewStatus.PREPARATION,
      },
    });

    return {
      ...ombuds,
      referral,
      boundaryMessage: RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE,
    };
  }

  async findByReferralId(referralId: string) {
    const ombuds = await this.prisma.ombudsOversightReferral.findUnique({
      where: { referralId },
      include: { referral: true },
    });

    if (!ombuds) {
      throw new NotFoundException('Ombuds oversight referral not found');
    }

    return ombuds;
  }
}
