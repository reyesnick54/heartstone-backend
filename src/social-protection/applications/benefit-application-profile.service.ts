import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { SocialProtectionActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';
import { BENEFIT_APPLICATION_PROFILE_PREFIX } from '../social-protection.constants';

@Injectable()
export class BenefitApplicationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async linkBenefitApplicationProfile(input: {
    benefitApplicantProfileId: string;
    benefitProgramId: string;
    benefitProgramVersionId: string;
    householdRecordId?: string;
    caseId: string;
    applicationId: string;
    actorPersona?: SocialProtectionActorPersona;
  }) {
    if (input.actorPersona) {
      this.boundary.assertPaymentDoesNotDetermineEligibility(input.actorPersona);
    }

    const profileNumber = `${BENEFIT_APPLICATION_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.benefitApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        benefitApplicantProfileId: input.benefitApplicantProfileId,
        benefitProgramId: input.benefitProgramId,
        benefitProgramVersionId: input.benefitProgramVersionId,
        householdRecordId: input.householdRecordId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        submissionAcknowledgedAt: new Date(),
        doesNotCreateBenefitAward: true,
        doesNotInferEligibility: true,
        paymentDoesNotDetermineEligibility: true,
      },
    });

    this.boundary.assertApplicationDoesNotCreateBenefitAward({
      doesNotCreateBenefitAward: profile.doesNotCreateBenefitAward,
      awardsCreated: 0,
    });

    return { profile, benefitAwardsCreated: 0 };
  }
}
