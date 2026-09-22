import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ClinicalSuitabilityOutcome,
  HealthcareActorPersona,
  TreatmentEligibilityReviewStatus,
  TreatmentProgramLifecycleStatus,
} from '@prisma/client';

import {
  FORBIDDEN_AI_CLINICAL_ACTIONS,
  FORBIDDEN_PLATFORM_ADMIN_CLINICAL_ACTIONS,
} from '../treatment.constants';

@Injectable()
export class TreatmentBoundaryService {
  assertCrossPatientBlocked(requesterIdentityId: string, subjectIdentityId: string): void {
    if (requesterIdentityId !== subjectIdentityId) {
      throw new ForbiddenException('Cross-patient healthcare treatment access is not permitted');
    }
  }

  assertApplicationDoesNotAuthorizeTreatment(input: {
    doesNotAuthorizeTreatment: boolean;
    treatmentAuthorized: boolean;
  }): void {
    if (input.treatmentAuthorized && input.doesNotAuthorizeTreatment) {
      throw new BadRequestException(
        'Treatment application submission does not authorize medical treatment',
      );
    }
  }

  assertReferralDoesNotEqualEnrollment(input: {
    doesNotEqualEnrollment: boolean;
    enrollmentCreatedFromReferralAlone: boolean;
  }): void {
    if (input.enrollmentCreatedFromReferralAlone && input.doesNotEqualEnrollment) {
      throw new BadRequestException(
        'Treatment referral does not create enrollment without governed workflow steps',
      );
    }
  }

  assertPaymentDoesNotCreateClinicalEligibility(actorPersona: HealthcareActorPersona): void {
    if (actorPersona === HealthcareActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException(
        'Payment receipt does not establish clinical suitability or treatment authorization',
      );
    }
  }

  assertAiCannotFinalizeClinicalSuitability(
    actorPersona: HealthcareActorPersona,
    action: string,
  ): void {
    if (
      actorPersona === HealthcareActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_CLINICAL_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`AI assistance cannot perform clinical action: ${action}`);
    }
  }

  assertPlatformAdminCannotMakeClinicalDecision(
    actorPersona: HealthcareActorPersona,
    action: string,
  ): void {
    if (
      actorPersona === HealthcareActorPersona.PLATFORM_ADMIN &&
      FORBIDDEN_PLATFORM_ADMIN_CLINICAL_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(
        'Platform administration cannot finalize clinical suitability determinations',
      );
    }
  }

  assertProfessionalLicenseValidForClinicalReview(input: {
    licenseValidUntil: Date;
    now?: Date;
  }): void {
    const now = input.now ?? new Date();
    if (input.licenseValidUntil.getTime() <= now.getTime()) {
      throw new ForbiddenException(
        'Expired or invalid professional license cannot finalize required clinical review',
      );
    }
  }

  assertClinicalReviewRequiresProfessionalActor(actorPersona: HealthcareActorPersona): void {
    if (actorPersona !== HealthcareActorPersona.CLINICAL_PROFESSIONAL) {
      throw new ForbiddenException(
        'Clinical suitability determination requires an authorized healthcare professional',
      );
    }
  }

  assertGovernmentAuthorityDoesNotSubstituteClinicalJudgment(input: {
    requiresProfessionalJudgment: boolean;
    clinicalOutcome: ClinicalSuitabilityOutcome;
    onlyGovernmentEvaluationProvided: boolean;
  }): void {
    if (
      input.requiresProfessionalJudgment &&
      input.onlyGovernmentEvaluationProvided &&
      input.clinicalOutcome !== ClinicalSuitabilityOutcome.PENDING
    ) {
      throw new BadRequestException(
        'Government administrative authority evaluation cannot substitute for professional clinical judgment',
      );
    }
  }

  assertClinicalJudgmentDoesNotCreateUnrelatedGovernmentAuthority(input: {
    clinicalOutcome: ClinicalSuitabilityOutcome;
    unrelatedGovernmentAuthorityCreated: boolean;
  }): void {
    if (
      input.clinicalOutcome !== ClinicalSuitabilityOutcome.PENDING &&
      input.unrelatedGovernmentAuthorityCreated
    ) {
      throw new BadRequestException(
        'Professional clinical judgment does not automatically create unrelated government authority',
      );
    }
  }

  assertSuspendedProgramBlocksNewEnrollment(input: {
    lifecycleStatus: TreatmentProgramLifecycleStatus;
    blocksNewEnrollmentWhenSuspended: boolean;
  }): void {
    if (
      input.lifecycleStatus === TreatmentProgramLifecycleStatus.SUSPENDED &&
      input.blocksNewEnrollmentWhenSuspended
    ) {
      throw new BadRequestException(
        'Suspended treatment program blocks new enrollment where configured',
      );
    }
  }

  assertEnrollmentStatusHistoryPreserved(existingHistoryId: string | null | undefined): void {
    if (!existingHistoryId) {
      return;
    }
    throw new BadRequestException(
      'Treatment enrollment status must be appended to history; destructive overwrite is forbidden',
    );
  }

  assertReviewFinalizationRequiresLicenseAndProfessional(input: {
    reviewStatus: TreatmentEligibilityReviewStatus;
    actorPersona: HealthcareActorPersona;
    licenseValidUntil: Date;
  }): void {
    if (input.reviewStatus !== TreatmentEligibilityReviewStatus.FINALIZED) {
      return;
    }
    this.assertClinicalReviewRequiresProfessionalActor(input.actorPersona);
    this.assertProfessionalLicenseValidForClinicalReview({
      licenseValidUntil: input.licenseValidUntil,
    });
  }
}
