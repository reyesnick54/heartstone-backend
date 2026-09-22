import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ClinicalRegulatoryApprovalStatus,
  ClinicalTrialConsentSignatureStatus,
  ClinicalTrialEligibilityAssessmentOutcome,
  ClinicalTrialEnrollmentStatus,
  ClinicalTrialListingLifecycleStatus,
  ClinicalTrialRecruitmentStatus,
  ResearchEthicsApprovalStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CLINICAL_RESEARCH_REASON_CODES } from '../clinical-research.constants';
import { ClinicalResearchBoundaryService } from '../common/clinical-research-boundary.service';
import { ResearchEthicsApprovalService } from '../ethics/research-ethics-approval.service';

export interface EnrollParticipantInput {
  enrollmentReference: string;
  clinicalTrialId: string;
  clinicalTrialSiteId: string;
  participantProfileId: string;
  protocolVersionId: string;
  consentVersionId: string;
  eligibilityAssessmentId: string;
  consentSignatureId: string;
}

@Injectable()
export class ClinicalTrialEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ClinicalResearchBoundaryService,
    private readonly ethicsApprovalService: ResearchEthicsApprovalService,
  ) {}

  async enrollParticipant(input: EnrollParticipantInput) {
    const trial = await this.prisma.clinicalTrial.findUnique({
      where: { id: input.clinicalTrialId },
      include: {
        ethicsApprovals: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { currentVersion: true },
        },
        regulatoryApprovals: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!trial) {
      throw new NotFoundException('Clinical trial not found');
    }

    const site = await this.prisma.clinicalTrialSite.findUnique({
      where: { id: input.clinicalTrialSiteId },
    });
    if (!site) {
      throw new BadRequestException('Enrollment requires an active trial site');
    }
    if (site.clinicalTrialId !== input.clinicalTrialId || !site.isActive) {
      throw new BadRequestException('Enrollment requires an active trial site');
    }

    const protocolVersion = await this.prisma.clinicalTrialProtocolVersion.findUnique({
      where: { id: input.protocolVersionId },
      include: { protocol: true },
    });
    if (!protocolVersion) {
      throw new BadRequestException('Enrollment requires an active protocol version');
    }
    if (
      protocolVersion.protocol.clinicalTrialId !== input.clinicalTrialId ||
      !protocolVersion.isActive
    ) {
      throw new BadRequestException('Enrollment requires an active protocol version');
    }

    const consentVersion = await this.prisma.clinicalTrialConsentVersion.findUnique({
      where: { id: input.consentVersionId },
      include: { consent: true },
    });
    if (!consentVersion) {
      throw new BadRequestException('Enrollment requires an active consent version');
    }
    if (
      consentVersion.consent.clinicalTrialId !== input.clinicalTrialId ||
      !consentVersion.isActive
    ) {
      throw new BadRequestException('Enrollment requires an active consent version');
    }

    const eligibility = await this.prisma.clinicalTrialEligibilityAssessment.findUnique({
      where: { id: input.eligibilityAssessmentId },
      include: { screening: true },
    });
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- preserve narrowing for downstream checks
    if (!eligibility || eligibility.screening.clinicalTrialId !== input.clinicalTrialId) {
      throw new NotFoundException('Eligibility assessment not found for trial');
    }

    const consentSignature = await this.prisma.clinicalTrialConsentSignature.findUnique({
      where: { id: input.consentSignatureId },
    });
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- preserve narrowing for downstream checks
    if (!consentSignature || consentSignature.consentVersionId !== input.consentVersionId) {
      throw new BadRequestException('Enrollment requires a matching consent signature');
    }

    this.boundary.assertConsentAloneDoesNotEnroll({
      hasActiveConsentSignature:
        consentSignature.status === ClinicalTrialConsentSignatureStatus.SIGNED,
      hasProfessionalEligibility:
        eligibility.outcome ===
        ClinicalTrialEligibilityAssessmentOutcome.DETERMINED_MEETS_PROFESSIONAL_CRITERIA,
      enrollmentAttempt: true,
    });

    this.boundary.assertEligibilityAloneDoesNotBypassConsent({
      hasProfessionalEligibility:
        eligibility.outcome ===
        ClinicalTrialEligibilityAssessmentOutcome.DETERMINED_MEETS_PROFESSIONAL_CRITERIA,
      hasActiveConsentSignature:
        consentSignature.status === ClinicalTrialConsentSignatureStatus.SIGNED,
      enrollmentAttempt: true,
    });

    if (
      eligibility.outcome !==
      ClinicalTrialEligibilityAssessmentOutcome.DETERMINED_MEETS_PROFESSIONAL_CRITERIA
    ) {
      throw new BadRequestException(
        'Enrollment requires a professional eligibility determination meeting criteria',
      );
    }

    if (consentSignature.status !== ClinicalTrialConsentSignatureStatus.SIGNED) {
      throw new BadRequestException({
        message: 'Signed informed consent is required for enrollment',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.CONSENT_ALONE_INSUFFICIENT,
      });
    }

    this.assertTrialAllowsEnrollment(trial.listingLifecycleStatus, trial.recruitmentStatus);
    this.assertEthicsAllowsEnrollment(trial.ethicsApprovals[0]);
    this.assertRegulatoryAllowsEnrollment(trial.regulatoryApprovals[0]);

    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.clinicalTrialEnrollment.create({
        data: {
          enrollmentReference: input.enrollmentReference,
          clinicalTrialId: input.clinicalTrialId,
          clinicalTrialSiteId: input.clinicalTrialSiteId,
          participantProfileId: input.participantProfileId,
          protocolVersionId: input.protocolVersionId,
          consentVersionId: input.consentVersionId,
          eligibilityAssessmentId: input.eligibilityAssessmentId,
          status: ClinicalTrialEnrollmentStatus.ENROLLED,
          enrolledAt: new Date(),
        },
      });

      await tx.clinicalTrialEnrollmentStatusHistory.create({
        data: {
          enrollmentId: enrollment.id,
          fromStatus: ClinicalTrialEnrollmentStatus.PENDING,
          toStatus: ClinicalTrialEnrollmentStatus.ENROLLED,
          actorPersona: 'SYSTEM',
        },
      });

      return enrollment;
    });
  }

  private assertTrialAllowsEnrollment(
    listingStatus: ClinicalTrialListingLifecycleStatus,
    recruitmentStatus: ClinicalTrialRecruitmentStatus,
  ): void {
    if (listingStatus === ClinicalTrialListingLifecycleStatus.SUSPENDED) {
      throw new BadRequestException({
        message: 'Suspended trials block new enrollment',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.TRIAL_SUSPENDED_BLOCKS_ENROLLMENT,
      });
    }
    if (recruitmentStatus === ClinicalTrialRecruitmentStatus.SUSPENDED) {
      throw new BadRequestException({
        message: 'Suspended recruitment blocks new enrollment',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.TRIAL_SUSPENDED_BLOCKS_ENROLLMENT,
      });
    }
    if (
      listingStatus !== ClinicalTrialListingLifecycleStatus.RECRUITING &&
      recruitmentStatus !== ClinicalTrialRecruitmentStatus.RECRUITING
    ) {
      throw new BadRequestException('Trial must be actively recruiting for enrollment');
    }
  }

  private assertEthicsAllowsEnrollment(
    ethics:
      | {
          status: ResearchEthicsApprovalStatus;
          blocksEnrollmentWhenInactive: boolean;
          currentVersion: { expiresAt: Date | null } | null;
        }
      | undefined,
  ): void {
    if (!ethics) {
      throw new BadRequestException('Configured enrollment requires research ethics approval');
    }
    if (!ethics.blocksEnrollmentWhenInactive) {
      return;
    }
    const active = this.ethicsApprovalService.isEthicsActiveForEnrollment(
      ethics.status,
      ethics.currentVersion?.expiresAt,
    );
    if (!active) {
      throw new BadRequestException({
        message: 'Inactive, expired, or suspended ethics approval blocks enrollment',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.ETHICS_BLOCKS_ENROLLMENT,
      });
    }
  }

  private assertRegulatoryAllowsEnrollment(
    regulatory:
      | {
          status: ClinicalRegulatoryApprovalStatus;
          blocksEnrollmentWhenInactive: boolean;
        }
      | undefined,
  ): void {
    if (!regulatory) {
      throw new BadRequestException('Configured enrollment requires regulatory approval status');
    }
    if (!regulatory.blocksEnrollmentWhenInactive) {
      return;
    }
    const allowed: ClinicalRegulatoryApprovalStatus[] = [
      ClinicalRegulatoryApprovalStatus.AUTHORIZED,
      ClinicalRegulatoryApprovalStatus.CONDITIONALLY_AUTHORIZED,
      ClinicalRegulatoryApprovalStatus.NOT_REQUIRED,
    ];
    if (!allowed.includes(regulatory.status)) {
      throw new BadRequestException('Regulatory status blocks enrollment');
    }
  }
}
