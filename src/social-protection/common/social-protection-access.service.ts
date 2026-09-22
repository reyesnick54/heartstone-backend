import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  type RepresentativeBenefitScope,
  SOCIAL_PROTECTION_REASON_CODES,
} from '../social-protection.constants';
import { SocialProtectionBoundaryService } from './social-protection-boundary.service';

export interface HouseholdSelfAccessContext {
  accessorIdentityId: string;
  householdRecordId: string;
  endpoint: string;
}

export interface RepresentativeHouseholdAccessContext {
  accessorIdentityId: string;
  householdRecordId: string;
  representativeAuthorityId: string;
  scope: RepresentativeBenefitScope;
  requestedScope: keyof RepresentativeBenefitScope;
  endpoint: string;
}

export interface CrossProgramHouseholdAccessContext {
  accessorCaseworkerIdentityId: string;
  householdRecordId: string;
  authorizedBenefitProgramId: string;
  requestedBenefitProgramId: string;
}

@Injectable()
export class SocialProtectionAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async assertHouseholdSelfAccess(context: HouseholdSelfAccessContext): Promise<void> {
    const household = await this.prisma.householdRecord.findUnique({
      where: { id: context.householdRecordId },
      include: {
        benefitApplicantProfile: true,
      },
    });
    if (!household?.benefitApplicantProfile) {
      throw new NotFoundException('Household record not found');
    }

    this.boundary.assertCrossHouseholdAccessBlocked(
      context.accessorIdentityId,
      household.benefitApplicantProfile.primaryApplicantIdentityId,
    );
  }

  async assertRepresentativeHouseholdAccess(
    context: RepresentativeHouseholdAccessContext,
  ): Promise<void> {
    const household = await this.prisma.householdRecord.findUnique({
      where: { id: context.householdRecordId },
      include: { benefitApplicantProfile: true },
    });
    if (!household?.benefitApplicantProfile) {
      throw new NotFoundException('Household record not found');
    }

    const authority = await this.prisma.representativeAuthority.findUnique({
      where: { id: context.representativeAuthorityId },
    });
    const now = new Date();
    const active =
      authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
      authority.identityId === context.accessorIdentityId &&
      authority.effectiveFrom <= now &&
      (authority.effectiveUntil == null || authority.effectiveUntil > now);

    if (!active) {
      throw new ForbiddenException(SOCIAL_PROTECTION_REASON_CODES.REPRESENTATIVE_SCOPE_DENIED);
    }

    this.boundary.assertRepresentativeScope(context.scope, context.requestedScope);
  }

  async assertCrossProgramHouseholdAccess(
    context: CrossProgramHouseholdAccessContext,
  ): Promise<void> {
    const household = await this.prisma.householdRecord.findUnique({
      where: { id: context.householdRecordId },
    });
    if (!household) {
      throw new NotFoundException('Household record not found');
    }

    this.boundary.assertCrossProgramAccessBlocked(
      context.authorizedBenefitProgramId,
      context.requestedBenefitProgramId,
    );
  }
}
