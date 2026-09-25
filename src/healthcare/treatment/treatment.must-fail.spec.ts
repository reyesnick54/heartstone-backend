import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ClinicalSuitabilityOutcome,
  HealthcareActorPersona,
  TreatmentEligibilityReviewStatus,
  TreatmentProgramLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { TreatmentPatientDataAccessPolicyService } from './access/healthcare-data-access-policy.service';
import { TreatmentBoundaryService } from './common/treatment-boundary.service';
import { TreatmentEnrollmentService } from './enrollment/treatment-enrollment.service';
import { TreatmentEligibilityReviewService } from './reviews/treatment-eligibility-review.service';

describe('Treatment must-fail gates', () => {
  describe('TreatmentBoundaryService', () => {
    let boundary: TreatmentBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TreatmentBoundaryService],
      }).compile();
      boundary = module.get(TreatmentBoundaryService);
    });

    it('citizen cannot see another patient treatment data', () => {
      expect(() => {
        boundary.assertCrossPatientBlocked('identity-a', 'identity-b');
      }).toThrow(ForbiddenException);
    });

    it('application does not equal treatment authorization', () => {
      expect(() => {
        boundary.assertApplicationDoesNotAuthorizeTreatment({
          doesNotAuthorizeTreatment: true,
          treatmentAuthorized: true,
        });
      }).toThrow(BadRequestException);
    });

    it('referral does not equal enrollment', () => {
      expect(() => {
        boundary.assertReferralDoesNotEqualEnrollment({
          doesNotEqualEnrollment: true,
          enrollmentCreatedFromReferralAlone: true,
        });
      }).toThrow(BadRequestException);
    });

    it('AI cannot make clinical suitability decision', () => {
      expect(() => {
        boundary.assertAiCannotFinalizeClinicalSuitability(
          HealthcareActorPersona.AI_ASSISTANCE,
          'FINALIZE_CLINICAL_SUITABILITY',
        );
      }).toThrow(ForbiddenException);
    });

    it('unlicensed/expired professional cannot finalize required professional review', () => {
      expect(() => {
        boundary.assertProfessionalLicenseValidForClinicalReview({
          licenseValidUntil: new Date('2020-01-01'),
        });
      }).toThrow(ForbiddenException);
    });

    it('payment does not create clinical eligibility', () => {
      expect(() => {
        boundary.assertPaymentDoesNotCreateClinicalEligibility(
          HealthcareActorPersona.PAYMENT_SYSTEM,
        );
      }).toThrow(ForbiddenException);
    });

    it('patient treatment history preserved', () => {
      expect(() => {
        boundary.assertEnrollmentStatusHistoryPreserved('history-1');
      }).toThrow(BadRequestException);
    });

    it('treatment program suspension prevents new enrollment where configured', () => {
      expect(() => {
        boundary.assertSuspendedProgramBlocksNewEnrollment({
          lifecycleStatus: TreatmentProgramLifecycleStatus.SUSPENDED,
          blocksNewEnrollmentWhenSuspended: true,
        });
      }).toThrow(BadRequestException);
    });

    it('platform admin cannot make clinical decision', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotMakeClinicalDecision(
          HealthcareActorPersona.PLATFORM_ADMIN,
          'FINALIZE_CLINICAL_SUITABILITY',
        );
      }).toThrow(ForbiddenException);
    });

    it('government authority does not substitute for professional clinical judgment', () => {
      expect(() => {
        boundary.assertGovernmentAuthorityDoesNotSubstituteClinicalJudgment({
          requiresProfessionalJudgment: true,
          clinicalOutcome: ClinicalSuitabilityOutcome.CLINICALLY_SUITABLE,
          onlyGovernmentEvaluationProvided: true,
        });
      }).toThrow(BadRequestException);
    });

    it('professional clinical judgment does not automatically create unrelated government authority', () => {
      expect(() => {
        boundary.assertClinicalJudgmentDoesNotCreateUnrelatedGovernmentAuthority({
          clinicalOutcome: ClinicalSuitabilityOutcome.CLINICALLY_SUITABLE,
          unrelatedGovernmentAuthorityCreated: true,
        });
      }).toThrow(BadRequestException);
    });
  });

  describe('TreatmentPatientDataAccessPolicyService', () => {
    const prisma = {
      treatmentPatientDataAccessGrant: { findFirst: jest.fn() },
      treatmentEnrollment: { findUnique: jest.fn() },
    };

    let access: TreatmentPatientDataAccessPolicyService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TreatmentPatientDataAccessPolicyService,
          TreatmentBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(TreatmentPatientDataAccessPolicyService);
      jest.clearAllMocks();
    });

    it('provider cannot access unrelated patient', async () => {
      prisma.treatmentPatientDataAccessGrant.findFirst.mockResolvedValue(null);

      await expect(
        access.assertProviderMayAccessPatient({
          actorIdentityId: 'provider-1',
          patientSubjectIdentityId: 'patient-2',
          requestedScope: 'viewEnrollments',
        }),
      ).rejects.toThrow(/TreatmentPatientDataAccessGrant/);
    });
  });

  describe('TreatmentEligibilityReviewService', () => {
    const prisma = {
      treatmentEligibilityReview: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    let reviews: TreatmentEligibilityReviewService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TreatmentEligibilityReviewService,
          TreatmentBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      reviews = module.get(TreatmentEligibilityReviewService);
      jest.clearAllMocks();
    });

    it('rejects AI finalizing clinical review', async () => {
      await expect(
        reviews.finalizeClinicalReview({
          reviewId: 'review-1',
          actorPersona: HealthcareActorPersona.AI_ASSISTANCE,
          actorIdentityId: 'ai-1',
          clinicalSuitabilityOutcome: ClinicalSuitabilityOutcome.CLINICALLY_SUITABLE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects expired license on finalize', async () => {
      prisma.treatmentEligibilityReview.findUnique.mockResolvedValue({
        id: 'review-1',
        reviewStatus: TreatmentEligibilityReviewStatus.DRAFT,
        professionalIdentityId: 'prof-1',
        professionalLicenseValidUntil: new Date('2020-01-01'),
        requiresProfessionalJudgment: true,
      });

      await expect(
        reviews.finalizeClinicalReview({
          reviewId: 'review-1',
          actorPersona: HealthcareActorPersona.CLINICAL_PROFESSIONAL,
          actorIdentityId: 'prof-1',
          clinicalSuitabilityOutcome: ClinicalSuitabilityOutcome.CLINICALLY_SUITABLE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('TreatmentEnrollmentService', () => {
    const prisma = {
      treatmentEnrollment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      treatmentEnrollmentStatusHistory: { create: jest.fn() },
    };

    let enrollments: TreatmentEnrollmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TreatmentEnrollmentService,
          TreatmentBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      enrollments = module.get(TreatmentEnrollmentService);
      jest.clearAllMocks();
    });

    it('blocks new enrollment when program suspended', async () => {
      prisma.treatmentEnrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        status: 'PROPOSED',
        treatmentProgram: {
          lifecycleStatus: TreatmentProgramLifecycleStatus.SUSPENDED,
          blocksNewEnrollmentWhenSuspended: true,
        },
        treatmentReferral: null,
        treatmentEligibilityReview: null,
      });

      await expect(enrollments.proposeEnrollment({ enrollmentId: 'enr-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
