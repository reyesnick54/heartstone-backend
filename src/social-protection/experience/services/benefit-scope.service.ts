import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class BenefitScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async requireBenefitApplicantProfile(identityId: string) {
    const profile = await this.prisma.benefitApplicantProfile.findFirst({
      where: { primaryApplicantIdentityId: identityId },
      orderBy: { createdAt: 'desc' },
    });
    if (!profile) {
      throw new NotFoundException('No benefit applicant profile is linked to this identity');
    }
    return profile;
  }

  buildOfficialJurisdictionFilter(jurisdictionIds: string[]) {
    return jurisdictionIds.length ? { jurisdictionId: { in: jurisdictionIds } } : {};
  }

  buildApplicantJurisdictionFilter(jurisdictionIds: string[]) {
    const base = this.buildOfficialJurisdictionFilter(jurisdictionIds);
    return Object.keys(base).length ? { benefitApplicantProfile: base } : {};
  }

  buildApplicationJurisdictionFilter(jurisdictionIds: string[]) {
    const base = this.buildOfficialJurisdictionFilter(jurisdictionIds);
    return Object.keys(base).length ? { benefitApplicantProfile: base } : {};
  }
}
