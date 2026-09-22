import { Injectable } from '@nestjs/common';
import {
  BenefitApplicationProfileStatus,
  BenefitAwardLifecycleStatus,
  BenefitEligibilityAssessmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { BenefitProgramDiscoveryService } from '../../programs/benefit-program-discovery.service';
import { SocialProtectionExperienceBoundaryService } from '../social-protection-experience-boundary.service';
import { BenefitScopeService } from './benefit-scope.service';

const ACTIVE_AWARD_STATUSES: BenefitAwardLifecycleStatus[] = [
  BenefitAwardLifecycleStatus.AWARDED,
  BenefitAwardLifecycleStatus.EFFECTIVE,
];

@Injectable()
export class CitizenBenefitsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: BenefitScopeService,
    private readonly boundary: SocialProtectionExperienceBoundaryService,
    private readonly programDiscovery: BenefitProgramDiscoveryService,
  ) {}

  async getHome(identityId: string) {
    const profile = await this.scope.requireBenefitApplicantProfile(identityId);
    const applicationProfiles = await this.prisma.benefitApplicationProfile.findMany({
      where: { benefitApplicantProfileId: profile.id },
      select: { id: true },
    });
    const applicationProfileIds = applicationProfiles.map((item) => item.id);

    const [pendingApplications, awards, preliminaryAssessments, disbursements, renewalsDue] =
      await Promise.all([
        this.prisma.benefitApplicationProfile.count({
          where: {
            benefitApplicantProfileId: profile.id,
            status: {
              in: [BenefitApplicationProfileStatus.LINKED, BenefitApplicationProfileStatus.ACTIVE],
            },
          },
        }),
        this.prisma.benefitAward.findMany({
          where: {
            benefitApplicationProfile: { benefitApplicantProfileId: profile.id },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        applicationProfileIds.length
          ? this.prisma.benefitEligibilityAssessment.count({
              where: {
                benefitApplicationProfileId: { in: applicationProfileIds },
                status: BenefitEligibilityAssessmentStatus.PRELIMINARY,
              },
            })
          : Promise.resolve(0),
        this.prisma.benefitDisbursementReference.count({
          where: {
            benefitAward: {
              benefitApplicationProfile: { benefitApplicantProfileId: profile.id },
            },
          },
        }),
        this.prisma.benefitRenewal.count({
          where: {
            benefitAward: {
              benefitApplicationProfile: { benefitApplicantProfileId: profile.id },
            },
          },
        }),
      ]);

    const activeAward = awards.find((item) => ACTIVE_AWARD_STATUSES.includes(item.lifecycleStatus));

    return {
      profileReferenceNumber: profile.profileReferenceNumber,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      preliminaryMatchDisclaimer: this.boundary.preliminaryMatchDisclaimer,
      paymentDisclaimer: this.boundary.paymentBoundaryDisclaimer,
      pendingApplications,
      preliminaryEligibilityAssessments: preliminaryAssessments,
      preliminaryMatchingIsNotAuthoritativeEligibility: true,
      activeAward: activeAward
        ? {
            awardNumber: activeAward.awardNumber,
            lifecycleStatus: activeAward.lifecycleStatus,
          }
        : null,
      disbursementReferences: disbursements,
      renewalItemsTracked: renewalsDue,
    };
  }

  async listPrograms(identityId: string) {
    const profile = await this.scope.requireBenefitApplicantProfile(identityId);
    const programs = await this.programDiscovery.listProgramsForGenericSearch(
      profile.jurisdictionId ?? undefined,
    );
    return programs.map((program) => ({
      programCode: program.programCode,
      programName: program.programName,
      categoryKind: program.benefitCategory.categoryKind,
      preliminaryMatchingOnly: true,
      isAuthoritativeEligibility: false,
    }));
  }

  async listApplications(identityId: string) {
    const profile = await this.scope.requireBenefitApplicantProfile(identityId);
    return this.prisma.benefitApplicationProfile.findMany({
      where: { benefitApplicantProfileId: profile.id },
      include: { benefitProgram: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAwards(identityId: string) {
    const profile = await this.scope.requireBenefitApplicantProfile(identityId);
    return this.prisma.benefitAward.findMany({
      where: {
        benefitApplicationProfile: { benefitApplicantProfileId: profile.id },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPayments(identityId: string) {
    const profile = await this.scope.requireBenefitApplicantProfile(identityId);
    return this.prisma.benefitDisbursementReference.findMany({
      where: {
        benefitAward: {
          benefitApplicationProfile: { benefitApplicantProfileId: profile.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string) {
    const profile = await this.scope.requireBenefitApplicantProfile(identityId);
    return {
      profileReferenceNumber: profile.profileReferenceNumber,
      availableActions: [
        { actionKey: 'apply_for_program', label: 'Apply for a benefit program' },
        { actionKey: 'report_change', label: 'Report change of circumstances' },
        { actionKey: 'benefit_payment_inquiry', label: 'Benefit payment inquiry' },
        { actionKey: 'public_benefits_appeal', label: 'Public benefits appeal' },
      ],
    };
  }
}
