import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ExternalReviewRouteType,
  ExternalReviewStatus,
  ProfessionalChallengeAuthorityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import { PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE } from '../redress.constants';
import { ExternalReviewReferralService } from './external-review-referral.service';

export interface CreateProfessionalChallengeReferralInput {
  redressMatterId: string;
  competentAuthorityType: ProfessionalChallengeAuthorityType;
  professionalBodyReference: string;
  challengeTargetReference: string;
  challengedFindingReference: string;
  competentAuthority: string;
  routeVersion: string;
  authorityPurpose: string;
  grounds: string;
  securityClassification: string;
  preparedByIdentityId?: string;
}

@Injectable()
export class ProfessionalChallengeReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly referralService: ExternalReviewReferralService,
  ) {}

  async create(input: CreateProfessionalChallengeReferralInput) {
    this.boundary.assertProfessionalIndependence({ technologySubstitutesAuthority: false });

    const referral = await this.referralService.create({
      redressMatterId: input.redressMatterId,
      routeType: ExternalReviewRouteType.PROFESSIONAL_CHALLENGE,
      competentAuthority: input.competentAuthority,
      routeVersion: input.routeVersion,
      authorityPurpose: input.authorityPurpose,
      grounds: input.grounds,
      securityClassification: input.securityClassification,
      preparedByIdentityId: input.preparedByIdentityId,
    });

    const challenge = await this.prisma.professionalChallengeReferral.create({
      data: {
        referralId: referral.id,
        redressMatterId: input.redressMatterId,
        competentAuthorityType: input.competentAuthorityType,
        professionalBodyReference: input.professionalBodyReference,
        challengeTargetReference: input.challengeTargetReference,
        challengedFindingReference: input.challengedFindingReference,
        independencePreserved: true,
        technologySubstitutesAuthority: false,
        status: ExternalReviewStatus.PREPARATION,
      },
    });

    return {
      ...challenge,
      referral,
      boundaryMessage: PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE,
    };
  }

  async findByReferralId(referralId: string) {
    const challenge = await this.prisma.professionalChallengeReferral.findUnique({
      where: { referralId },
      include: { referral: true },
    });

    if (!challenge) {
      throw new NotFoundException('Professional challenge referral not found');
    }

    return challenge;
  }
}
