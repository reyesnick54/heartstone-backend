import { Injectable } from '@nestjs/common';
import {
  ClinicalSuitabilityOutcome,
  TreatmentEligibilityReviewStatus,
  TreatmentEnrollmentStatus,
  TreatmentReferralStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import { HealthcareDataAccessPolicyService } from '../../access/healthcare-data-access-policy.service';

@Injectable()
export class ProviderHealthcareProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: HealthcareDataAccessPolicyService,
  ) {}

  async getWorkspace(providerIdentityId: string, organizationId?: string | null) {
    const policies = await this.prisma.treatmentPatientDataAccessGrant.findMany({
      where: {
        isActive: true,
        OR: [
          { granteeProviderIdentityId: providerIdentityId },
          ...(organizationId ? [{ granteeOrganizationId: organizationId }] : []),
        ],
      },
      select: { patientSubjectIdentityId: true, authorizedDataCategories: true },
    });

    const patientIds = [...new Set(policies.map((policy) => policy.patientSubjectIdentityId))];
    if (patientIds.length === 0) {
      return {
        referredPatients: [],
        screenings: [],
        pendingProfessionalReviews: [],
        enrollments: [],
        appointments: [],
        requiredCommunications: [],
        programCapacity: [],
      };
    }

    const [
      referredPatients,
      screenings,
      pendingProfessionalReviews,
      enrollments,
      appointmentReferences,
      programs,
    ] = await Promise.all([
      this.prisma.treatmentReferral.findMany({
        where: {
          patientIdentityId: { in: patientIds },
          status: { in: [TreatmentReferralStatus.RECEIVED, TreatmentReferralStatus.SENT] },
        },
        select: {
          referralNumber: true,
          patientIdentityId: true,
          status: true,
          treatmentProgram: { select: { programCode: true, name: true } },
        },
      }),
      this.prisma.treatmentScreening.findMany({
        where: { patientIdentityId: { in: patientIds } },
        select: {
          screeningNumber: true,
          patientIdentityId: true,
          status: true,
          scheduledAt: true,
          patientSafeSummary: true,
        },
      }),
      this.prisma.treatmentEligibilityReview.findMany({
        where: {
          reviewStatus: TreatmentEligibilityReviewStatus.DRAFT,
          treatmentApplication: { patientIdentityId: { in: patientIds } },
        },
        select: {
          reviewNumber: true,
          professionalIdentityId: true,
          clinicalSuitabilityOutcome: true,
          treatmentApplication: { select: { patientIdentityId: true, applicationNumber: true } },
        },
      }),
      this.prisma.treatmentEnrollment.findMany({
        where: {
          patientIdentityId: { in: patientIds },
          status: {
            in: [TreatmentEnrollmentStatus.ACTIVE, TreatmentEnrollmentStatus.PROPOSED],
          },
        },
        select: {
          enrollmentNumber: true,
          patientIdentityId: true,
          status: true,
          treatmentProgram: { select: { programCode: true, name: true } },
        },
      }),
      this.prisma.treatmentAppointmentReference.findMany({
        where: { treatmentEnrollment: { patientIdentityId: { in: patientIds } } },
        include: {
          serviceAppointment: true,
          treatmentEnrollment: { select: { patientIdentityId: true, enrollmentNumber: true } },
        },
      }),
      this.prisma.treatmentProgramSite.findMany({
        where: { isActive: true },
        select: {
          siteCode: true,
          siteName: true,
          capacityReference: true,
          treatmentProgram: { select: { programCode: true, name: true } },
        },
      }),
    ]);

    for (const patientId of patientIds) {
      await this.accessPolicy.assertProviderMayAccessPatient({
        actorIdentityId: providerIdentityId,
        patientSubjectIdentityId: patientId,
        organizationId,
        requestedScope: 'viewReferredPatients',
      });
    }

    return {
      referredPatients,
      screenings,
      pendingProfessionalReviews: pendingProfessionalReviews.filter(
        (review) => review.clinicalSuitabilityOutcome === ClinicalSuitabilityOutcome.PENDING,
      ),
      enrollments,
      appointments: appointmentReferences.map((ref) => ({
        appointmentReference: ref.serviceAppointment.appointmentReference,
        privacyClassification: ref.privacyClassification,
        enrollmentNumber: ref.treatmentEnrollment.enrollmentNumber,
        patientIdentityId: ref.treatmentEnrollment.patientIdentityId,
        scheduledStartsAt: ref.serviceAppointment.scheduledStartsAt,
      })),
      requiredCommunications: enrollments.map((enrollment) => ({
        enrollmentNumber: enrollment.enrollmentNumber,
        action: 'REVIEW_REQUIRED_PATIENT_COMMUNICATION',
      })),
      programCapacity: programs,
    };
  }
}
