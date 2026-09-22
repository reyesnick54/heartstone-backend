import { Injectable } from '@nestjs/common';
import {
  ServiceAppointmentStatus,
  TreatmentApplicationStatus,
  TreatmentEnrollmentStatus,
  TreatmentReferralStatus,
  TreatmentScreeningStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import { TreatmentExperienceBoundaryService } from '../../boundary/treatment-experience-boundary.service';
import { HealthcareScopeService } from './healthcare-scope.service';

@Injectable()
export class CitizenHealthcareProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: HealthcareScopeService,
    private readonly boundary: TreatmentExperienceBoundaryService,
  ) {}

  async getHome(identityId: string) {
    const [applications, referrals, screenings, enrollments, actions] = await Promise.all([
      this.listApplications(identityId),
      this.listReferrals(identityId),
      this.listTreatments(identityId),
      this.listEnrolledPrograms(identityId),
      this.listActions(identityId),
    ]);

    return this.boundary.sanitizeCitizenPayload({
      disclaimer: this.boundary.disclaimer,
      applications: applications.items,
      referrals: referrals.items,
      screenings: screenings.screenings,
      enrolledPrograms: enrollments.items,
      requiredActions: actions.items,
      consentState: actions.consentState,
      trialOpportunities: screenings.trialOpportunities,
    });
  }

  async getProfile(identityId: string) {
    const profile = await this.prisma.patientHealthcareProfile.findFirst({
      where: this.scope.buildCitizenPatientWhere(identityId),
      include: { currentStatusProjection: true },
    });

    return this.boundary.sanitizeCitizenPayload({
      profileNumber: profile?.profileNumber,
      publicStatusLabel: profile?.currentStatusProjection?.publicStatusLabel,
      publicMessage: profile?.currentStatusProjection?.publicMessage,
      consentStateCode: profile?.currentStatusProjection?.consentStateCode,
      disclaimer: this.boundary.disclaimer,
    });
  }

  async listProviders(identityId: string) {
    const enrollments = await this.prisma.treatmentEnrollment.findMany({
      where: {
        ...this.scope.buildCitizenEnrollmentWhere(identityId),
        status: { in: [TreatmentEnrollmentStatus.ACTIVE, TreatmentEnrollmentStatus.PROPOSED] },
      },
      include: {
        treatmentProgram: { include: { providers: { where: { isActive: true } } } },
        careTeamReferences: { where: { isActive: true } },
      },
    });

    const providers = enrollments.flatMap((enrollment) =>
      enrollment.treatmentProgram.providers.map((provider) => ({
        programCode: enrollment.treatmentProgram.programCode,
        providerOrganizationId: provider.providerOrganizationId,
        providerIdentityId: provider.providerIdentityId,
        providerRole: provider.providerRole,
      })),
    );

    return { items: providers, disclaimer: this.boundary.disclaimer };
  }

  async listPrograms(identityId: string) {
    const profile = await this.prisma.patientHealthcareProfile.findFirst({
      where: { subjectIdentityId: identityId },
      select: { jurisdictionId: true },
    });

    const programs = await this.prisma.treatmentProgram.findMany({
      where: {
        ...this.scope.buildPublishedProgramWhere(),
        ...(profile?.jurisdictionId
          ? { OR: [{ jurisdictionId: null }, { jurisdictionId: profile.jurisdictionId }] }
          : {}),
      },
      select: {
        programCode: true,
        name: true,
        description: true,
        programKind: true,
        lifecycleStatus: true,
        doesNotRecommendTreatment: true,
        isDiscoveryOnly: true,
      },
    });

    return {
      items: programs.map((program) =>
        this.boundary.sanitizeCitizenPayload({
          ...program,
          discoveryOnly: program.isDiscoveryOnly,
          notMedicalRecommendation: program.doesNotRecommendTreatment,
        }),
      ),
      disclaimer: this.boundary.disclaimer,
    };
  }

  async listApplications(identityId: string) {
    const items = await this.prisma.treatmentApplication.findMany({
      where: this.scope.buildCitizenApplicationWhere(identityId),
      select: {
        applicationNumber: true,
        status: true,
        doesNotAuthorizeTreatment: true,
        administrativeEligibilityOutcome: true,
        consentReference: true,
        treatmentProgram: { select: { programCode: true, name: true } },
      },
    });

    return {
      items: items.map((item) =>
        this.boundary.sanitizeCitizenPayload({
          applicationNumber: item.applicationNumber,
          status: item.status,
          programCode: item.treatmentProgram.programCode,
          programName: item.treatmentProgram.name,
          notTreatmentAuthorization: item.doesNotAuthorizeTreatment,
          administrativeEligibilityOutcome: item.administrativeEligibilityOutcome,
          consentReference: item.consentReference,
        }),
      ),
    };
  }

  async listReferrals(identityId: string) {
    const items = await this.prisma.treatmentReferral.findMany({
      where: this.scope.buildCitizenReferralWhere(identityId),
      select: {
        referralNumber: true,
        status: true,
        doesNotGuaranteeEnrollment: true,
        doesNotEqualEnrollment: true,
        treatmentProgram: { select: { programCode: true, name: true } },
      },
    });

    return {
      items: items.map((item) =>
        this.boundary.sanitizeCitizenPayload({
          referralNumber: item.referralNumber,
          status: item.status,
          programCode: item.treatmentProgram.programCode,
          notGuaranteedEnrollment: item.doesNotGuaranteeEnrollment,
          notEnrollment: item.doesNotEqualEnrollment,
        }),
      ),
    };
  }

  async listTreatments(identityId: string) {
    const screenings = await this.prisma.treatmentScreening.findMany({
      where: { patientIdentityId: identityId },
      select: {
        screeningNumber: true,
        status: true,
        scheduledAt: true,
        patientSafeSummary: true,
        dataClassification: true,
      },
    });

    const enrollments = await this.listEnrolledPrograms(identityId);
    const { programsAndTreatments, trialOpportunities } = this.boundary.separateTrialOpportunities(
      enrollments.items,
    );

    return {
      screenings: screenings.map((screening) =>
        this.boundary.sanitizeCitizenPayload({
          screeningNumber: screening.screeningNumber,
          status: screening.status,
          scheduledAt: screening.scheduledAt,
          summary: screening.patientSafeSummary,
        }),
      ),
      enrollments: programsAndTreatments,
      trialOpportunities,
    };
  }

  async listEnrolledPrograms(identityId: string) {
    const items = await this.prisma.treatmentEnrollment.findMany({
      where: {
        patientIdentityId: identityId,
        status: {
          in: [
            TreatmentEnrollmentStatus.ACTIVE,
            TreatmentEnrollmentStatus.PROPOSED,
            TreatmentEnrollmentStatus.SUSPENDED,
          ],
        },
      },
      include: {
        treatmentProgram: { select: { programCode: true, name: true } },
        statusProjections: { take: 1, orderBy: { effectiveFrom: 'desc' } },
      },
    });

    return {
      items: items.map((item) =>
        this.boundary.sanitizeCitizenPayload({
          enrollmentNumber: item.enrollmentNumber,
          status: item.status,
          programCode: item.treatmentProgram.programCode,
          programName: item.treatmentProgram.name,
          publicStatusLabel: item.statusProjections[0]?.publicStatusLabel,
          trialOpportunitySeparate: item.statusProjections[0]?.trialOpportunitySeparate ?? false,
          notClinicalOutcome: item.doesNotEqualClinicalOutcome,
        }),
      ),
    };
  }

  async listAppointments(identityId: string) {
    const refs = await this.prisma.treatmentAppointmentReference.findMany({
      where: {
        treatmentEnrollment: { patientIdentityId: identityId },
      },
      include: {
        serviceAppointment: {
          include: { appointmentReason: true },
        },
        treatmentEnrollment: {
          select: { enrollmentNumber: true, treatmentProgram: { select: { programCode: true } } },
        },
      },
    });

    const upcomingStatuses = new Set<ServiceAppointmentStatus>([
      ServiceAppointmentStatus.REQUESTED,
      ServiceAppointmentStatus.SCHEDULED,
      ServiceAppointmentStatus.CONFIRMED,
      ServiceAppointmentStatus.RESCHEDULED,
    ]);
    const upcoming = refs.filter((ref) => upcomingStatuses.has(ref.serviceAppointment.status));

    return {
      items: upcoming.map((ref) =>
        this.boundary.sanitizeCitizenPayload({
          appointmentReference: ref.serviceAppointment.appointmentReference,
          status: ref.serviceAppointment.status,
          scheduledStartsAt: ref.serviceAppointment.scheduledStartsAt,
          privacyClassification: ref.privacyClassification,
          patientSafeLabel: ref.patientSafeLabel,
          enrollmentNumber: ref.treatmentEnrollment.enrollmentNumber,
          programCode: ref.treatmentEnrollment.treatmentProgram.programCode,
        }),
      ),
      disclaimer: this.boundary.disclaimer,
    };
  }

  async listActions(identityId: string) {
    const [pendingApplications, pendingScreenings, pendingReferrals, profile] = await Promise.all([
      this.prisma.treatmentApplication.count({
        where: {
          patientIdentityId: identityId,
          status: {
            in: [
              TreatmentApplicationStatus.SUBMITTED,
              TreatmentApplicationStatus.UNDER_ADMIN_REVIEW,
              TreatmentApplicationStatus.PENDING_CLINICAL_REVIEW,
            ],
          },
        },
      }),
      this.prisma.treatmentScreening.count({
        where: {
          patientIdentityId: identityId,
          status: {
            in: [TreatmentScreeningStatus.SCHEDULED, TreatmentScreeningStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.treatmentReferral.count({
        where: {
          patientIdentityId: identityId,
          status: { in: [TreatmentReferralStatus.REQUESTED, TreatmentReferralStatus.SENT] },
        },
      }),
      this.prisma.patientHealthcareProfile.findFirst({
        where: { subjectIdentityId: identityId },
        include: { currentStatusProjection: true },
      }),
    ]);

    const items: string[] = [];
    if (pendingApplications > 0) {
      items.push('COMPLETE_TREATMENT_APPLICATION_REQUIREMENTS');
    }
    if (pendingScreenings > 0) {
      items.push('ATTEND_CLINICAL_SCREENING');
    }
    if (pendingReferrals > 0) {
      items.push('REVIEW_TREATMENT_REFERRAL_STATUS');
    }
    if (profile?.currentStatusProjection?.requiresPatientAction) {
      items.push('REVIEW_REQUIRED_PATIENT_ACTION');
    }

    return {
      items,
      consentState: profile?.currentStatusProjection?.consentStateCode ?? 'UNKNOWN',
    };
  }
}
