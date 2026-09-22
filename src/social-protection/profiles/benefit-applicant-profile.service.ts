import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { BENEFIT_APPLICANT_PROFILE_PREFIX } from '../social-protection.constants';

@Injectable()
export class BenefitApplicantProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createBenefitApplicantProfile(input: {
    primaryApplicantIdentityId: string;
    jurisdictionId?: string;
    masterAdministrativeFileId?: string;
  }) {
    const profileReferenceNumber = `${BENEFIT_APPLICANT_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.benefitApplicantProfile.create({
      data: {
        id: randomUUID(),
        profileReferenceNumber,
        primaryApplicantIdentityId: input.primaryApplicantIdentityId,
        jurisdictionId: input.jurisdictionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
      },
    });
  }
}
