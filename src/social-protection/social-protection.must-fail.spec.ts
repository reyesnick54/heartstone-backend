import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ExternalDeterminationStatus,
  ExternalEligibilityDeterminationRecordedBy,
  RepresentativeAuthorityStatus,
  SocialProtectionActorPersona,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { SocialProtectionAppealReferenceService } from './appeals/social-protection-appeal-reference.service';
import { BenefitApplicationProfileService } from './applications/benefit-application-profile.service';
import { BenefitAwardService } from './awards/benefit-award.service';
import { BenefitSuspensionService } from './awards/benefit-suspension.service';
import { SocialProtectionAccessService } from './common/social-protection-access.service';
import { SocialProtectionBoundaryService } from './common/social-protection-boundary.service';
import { BenefitEligibilityAssessmentService } from './eligibility/benefit-eligibility-assessment.service';
import { ConfigurableBenefitEligibilityEngine } from './eligibility/configurable-benefit-eligibility.engine';
import { ExternalEligibilityDeterminationService } from './external/external-eligibility-determination.service';
import { BenefitDisbursementReferenceService } from './payments/benefit-disbursement-reference.service';
import { PLATFORM_ADMIN_SOCIAL_PROTECTION_ROLE_MARKER } from './social-protection.constants';

describe('Social protection must-fail gates', () => {
  describe('SocialProtectionBoundaryService', () => {
    let boundary: SocialProtectionBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [SocialProtectionBoundaryService],
      }).compile();
      boundary = module.get(SocialProtectionBoundaryService);
    });

    it('payment does not determine eligibility', () => {
      expect(() => {
        boundary.assertPaymentDoesNotDetermineEligibility(
          SocialProtectionActorPersona.PAYMENT_SYSTEM,
        );
      }).toThrow(ForbiddenException);
    });

    it('AI risk score cannot terminate benefit', () => {
      expect(() => {
        boundary.assertAiCannotTerminateBenefit(
          SocialProtectionActorPersona.AI_ASSISTANCE,
          'TERMINATE_BENEFIT',
          true,
        );
      }).toThrow(ForbiddenException);
    });

    it('platform admin cannot create award', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotCreateAward(PLATFORM_ADMIN_SOCIAL_PROTECTION_ROLE_MARKER);
      }).toThrow(ForbiddenException);
    });

    it('suspension requires configured authority', () => {
      expect(() => {
        boundary.assertSuspensionRequiresConfiguredAuthority({});
      }).toThrow(ForbiddenException);
    });

    it('external eligibility dependency cannot be applicant-forged', () => {
      expect(() => {
        boundary.rejectApplicantForgedExternalDetermination(
          {
            isAuthenticated: true,
            determinationStatus: ExternalDeterminationStatus.GRANTED,
          },
          SocialProtectionActorPersona.APPLICANT,
        );
      }).toThrow(ForbiddenException);
    });

    it('appeal preserves original decision', () => {
      expect(() => {
        boundary.assertAppealPreservesOriginalDecision(false);
      }).toThrow(BadRequestException);
    });
  });

  describe('SocialProtectionAccessService', () => {
    const prisma = {
      householdRecord: { findUnique: jest.fn() },
      representativeAuthority: { findUnique: jest.fn() },
    };

    let access: SocialProtectionAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          SocialProtectionAccessService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(SocialProtectionAccessService);
      jest.clearAllMocks();
    });

    it('applicant cannot access another household', async () => {
      prisma.householdRecord.findUnique.mockResolvedValue({
        id: 'hh-1',
        benefitApplicantProfile: { primaryApplicantIdentityId: 'identity-a' },
      });

      await expect(
        access.assertHouseholdSelfAccess({
          accessorIdentityId: 'identity-b',
          householdRecordId: 'hh-1',
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('representative scope enforced', async () => {
      prisma.householdRecord.findUnique.mockResolvedValue({
        id: 'hh-1',
        benefitApplicantProfile: { primaryApplicantIdentityId: 'identity-a' },
      });
      prisma.representativeAuthority.findUnique.mockResolvedValue({
        status: RepresentativeAuthorityStatus.ACTIVE,
        identityId: 'rep-1',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      });

      await expect(
        access.assertRepresentativeHouseholdAccess({
          accessorIdentityId: 'rep-1',
          householdRecordId: 'hh-1',
          representativeAuthorityId: 'auth-1',
          scope: { viewHousehold: false },
          requestedScope: 'viewHousehold',
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sensitive household data not exposed across programs without authorization', async () => {
      prisma.householdRecord.findUnique.mockResolvedValue({ id: 'hh-1' });

      await expect(
        access.assertCrossProgramHouseholdAccess({
          accessorCaseworkerIdentityId: 'cw-1',
          householdRecordId: 'hh-1',
          authorizedBenefitProgramId: 'program-a',
          requestedBenefitProgramId: 'program-b',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('BenefitApplicationProfileService', () => {
    const prisma = { benefitApplicationProfile: { create: jest.fn() } };
    let service: BenefitApplicationProfileService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          BenefitApplicationProfileService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(BenefitApplicationProfileService);
      jest.clearAllMocks();
    });

    it('application does not create benefit award', async () => {
      prisma.benefitApplicationProfile.create.mockResolvedValue({
        id: 'bap-1',
        doesNotCreateBenefitAward: true,
      });

      const result = await service.linkBenefitApplicationProfile({
        benefitApplicantProfileId: 'prof-1',
        benefitProgramId: 'prog-1',
        benefitProgramVersionId: 'ver-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.benefitAwardsCreated).toBe(0);
    });
  });

  describe('BenefitEligibilityAssessmentService', () => {
    const prisma = {
      benefitProgramVersion: { findUnique: jest.fn() },
      benefitEligibilityAssessment: { create: jest.fn() },
    };

    let service: BenefitEligibilityAssessmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          BenefitEligibilityAssessmentService,
          SocialProtectionBoundaryService,
          ConfigurableBenefitEligibilityEngine,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(BenefitEligibilityAssessmentService);
      jest.clearAllMocks();
    });

    it('eligibility calculation does not automatically create award unless explicit workflow permits', async () => {
      prisma.benefitProgramVersion.findUnique.mockResolvedValue({
        id: 'ver-1',
        workflowPermitsAutoAward: false,
        humanDecisionRequired: true,
      });

      await expect(
        service.recordPreliminaryAssessment({
          benefitApplicationProfileId: 'bap-1',
          benefitProgramId: 'prog-1',
          benefitProgramVersionId: 'ver-1',
          eligibilityRuleVersionReference: 'rule-v1',
          inputFacts: {},
          createAwardIfPermitted: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('BenefitDisbursementReferenceService', () => {
    const prisma = { benefitDisbursementReference: { create: jest.fn() } };
    let service: BenefitDisbursementReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          BenefitDisbursementReferenceService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(BenefitDisbursementReferenceService);
      jest.clearAllMocks();
    });

    it('payment does not determine eligibility', async () => {
      await expect(
        service.linkDisbursementReference({
          benefitAwardId: 'award-1',
          actorPersona: SocialProtectionActorPersona.PAYMENT_SYSTEM,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('BenefitAwardService', () => {
    const prisma = {
      benefitAward: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      benefitAwardVersion: { create: jest.fn(), update: jest.fn(), count: jest.fn() },
      benefitStatusHistory: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    let service: BenefitAwardService;

    beforeEach(async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      );
      const module = await Test.createTestingModule({
        providers: [
          BenefitAwardService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(BenefitAwardService);
      jest.clearAllMocks();
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      );
    });

    it('platform admin cannot create award via service', async () => {
      await expect(
        service.createAuthoritativeAward({
          benefitProgramId: 'prog-1',
          benefitProgramVersionId: 'ver-1',
          actorPersona: SocialProtectionActorPersona.BENEFIT_DECISION_OFFICER,
          actorRoleMarker: PLATFORM_ADMIN_SOCIAL_PROTECTION_ROLE_MARKER,
          humanDecisionRecorded: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prior award versions preserved when recording changes', async () => {
      prisma.benefitAward.findUnique.mockResolvedValue({
        id: 'award-1',
        currentBenefitAwardVersionId: 'ver-1',
        versions: [{ id: 'ver-1', versionNumber: 1 }],
      });
      prisma.benefitAwardVersion.update.mockResolvedValue({});
      prisma.benefitAwardVersion.create.mockResolvedValue({ id: 'ver-2', versionNumber: 2 });
      prisma.benefitAward.update.mockResolvedValue({ id: 'award-1' });

      const result = await service.recordAwardVersionChange({
        benefitAwardId: 'award-1',
        amountCents: 1000,
        actorPersona: SocialProtectionActorPersona.BENEFIT_DECISION_OFFICER,
      });

      expect(result.priorVersionsPreserved).toBe(true);
      expect(prisma.benefitAwardVersion.update).toHaveBeenCalled();
    });
  });

  describe('BenefitSuspensionService', () => {
    const prisma = {
      benefitAward: { findUnique: jest.fn(), update: jest.fn() },
      benefitSuspension: { create: jest.fn() },
    };

    let service: BenefitSuspensionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          BenefitSuspensionService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(BenefitSuspensionService);
      jest.clearAllMocks();
    });

    it('suspension requires configured authority via service', async () => {
      await expect(
        service.proposeSuspension({
          benefitAwardId: 'award-1',
          actorPersona: SocialProtectionActorPersona.CASEWORKER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ExternalEligibilityDeterminationService', () => {
    const prisma = { externalEligibilityDeterminationReference: { create: jest.fn() } };
    let service: ExternalEligibilityDeterminationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ExternalEligibilityDeterminationService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(ExternalEligibilityDeterminationService);
    });

    it('blocks applicant forged external eligibility', async () => {
      await expect(
        service.recordDetermination(SocialProtectionActorPersona.APPLICANT, {
          externalAuthorityId: 'ea-1',
          determinationStatus: ExternalDeterminationStatus.GRANTED,
          isAuthenticated: true,
          recordedBy: ExternalEligibilityDeterminationRecordedBy.SYSTEM,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('SocialProtectionAppealReferenceService', () => {
    const prisma = {
      benefitAward: { findUnique: jest.fn() },
      benefitAwardVersion: { findUnique: jest.fn() },
      socialProtectionAppealReference: { create: jest.fn() },
    };

    let service: SocialProtectionAppealReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          SocialProtectionAppealReferenceService,
          SocialProtectionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(SocialProtectionAppealReferenceService);
      jest.clearAllMocks();
    });

    it('appeal preserves original decision', async () => {
      prisma.benefitAward.findUnique.mockResolvedValue({ id: 'award-1' });
      prisma.benefitAwardVersion.findUnique.mockResolvedValue({
        id: 'ver-1',
        benefitAwardId: 'award-1',
      });
      prisma.socialProtectionAppealReference.create.mockResolvedValue({
        id: 'appeal-1',
        preservesOriginalDecision: true,
        originalBenefitAwardVersionId: 'ver-1',
      });

      const result = await service.linkAppealReference({
        benefitAwardId: 'award-1',
        originalBenefitAwardVersionId: 'ver-1',
      });

      expect(result.originalDecisionPreserved).toBe(true);
      expect(result.originalBenefitAwardVersionId).toBe('ver-1');
    });
  });
});
