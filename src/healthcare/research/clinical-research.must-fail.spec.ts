import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ClinicalRegulatoryApprovalStatus,
  ClinicalResearchActorPersona,
  ClinicalTrialConsentSignatureStatus,
  ClinicalTrialEligibilityAssessmentOutcome,
  ClinicalTrialEnrollmentStatus,
  ClinicalTrialListingLifecycleStatus,
  ClinicalTrialRecruitmentStatus,
  PreliminaryTrialMatchOutcome,
  ResearchEthicsApprovalStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ClinicalResearchAccessService } from './common/clinical-research-access.service';
import { ClinicalResearchBoundaryService } from './common/clinical-research-boundary.service';
import { ClinicalTrialDiscoveryService } from './discovery/clinical-trial-discovery.service';
import { ClinicalTrialEnrollmentService } from './enrollment/clinical-trial-enrollment.service';
import { ResearchEthicsApprovalService } from './ethics/research-ethics-approval.service';
import { PreliminaryTrialMatchingService } from './matching/preliminary-trial-matching.service';
import { ClinicalTrialProtocolVersionService } from './protocol/clinical-trial-protocol-version.service';
import { ClinicalTrialWithdrawalService } from './withdrawal/clinical-trial-withdrawal.service';

describe('Clinical research must-fail gates', () => {
  describe('ClinicalResearchBoundaryService', () => {
    let boundary: ClinicalResearchBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ClinicalResearchBoundaryService],
      }).compile();
      boundary = module.get(ClinicalResearchBoundaryService);
    });

    it('AI cannot make final eligibility decision', () => {
      expect(() => {
        boundary.assertAiCannotFinalizeEligibility('FINALIZE_ELIGIBILITY');
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertAiCannotRecordProfessionalScreening(
          ClinicalResearchActorPersona.AI_ASSISTANCE,
        );
      }).toThrow(ForbiddenException);
    });

    it('consent alone does not enroll patient', () => {
      expect(() => {
        boundary.assertConsentAloneDoesNotEnroll({
          hasActiveConsentSignature: true,
          hasProfessionalEligibility: false,
          enrollmentAttempt: true,
        });
      }).toThrow(BadRequestException);
    });

    it('professional eligibility alone does not bypass consent', () => {
      expect(() => {
        boundary.assertEligibilityAloneDoesNotBypassConsent({
          hasProfessionalEligibility: true,
          hasActiveConsentSignature: false,
          enrollmentAttempt: true,
        });
      }).toThrow(BadRequestException);
    });

    it('trial sponsor cannot self-mark ethics approval', () => {
      expect(() => {
        boundary.assertSponsorCannotSelfApproveEthics(
          ClinicalResearchActorPersona.TRIAL_SPONSOR,
          'MARK_ETHICS_APPROVED',
        );
      }).toThrow(ForbiddenException);
    });
  });

  describe('PreliminaryTrialMatchingService', () => {
    let matching: PreliminaryTrialMatchingService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PreliminaryTrialMatchingService],
      }).compile();
      matching = module.get(PreliminaryTrialMatchingService);
    });

    it('preliminary match is not labeled clinically eligible', () => {
      const result = matching.match({
        participantAgeYears: 40,
        conditionCategoryCode: 'ONCOLOGY',
        trialMinimumAgeYears: 18,
        trialMaximumAgeYears: 65,
        trialConditionCategoryCode: 'ONCOLOGY',
      });
      expect(result.isClinicalEligibility).toBe(false);
      expect(result.outcome).toBe(PreliminaryTrialMatchOutcome.POTENTIAL_MATCH);
      expect(result.outcomeLabel.toLowerCase()).not.toContain('clinically eligible');
      expect(result.outcome as string).not.toBe('ELIGIBLE');
    });
  });

  describe('ClinicalTrialDiscoveryService', () => {
    const prisma = {
      clinicalTrial: {
        findMany: jest.fn(),
      },
    };

    let discovery: ClinicalTrialDiscoveryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ClinicalTrialDiscoveryService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      discovery = module.get(ClinicalTrialDiscoveryService);
      jest.clearAllMocks();
    });

    it('citizen can discover recruiting trial without accessing participant data', async () => {
      prisma.clinicalTrial.findMany.mockResolvedValue([
        {
          id: 'trial-1',
          trialNumber: 'CTRI-001',
          recruitmentStatus: ClinicalTrialRecruitmentStatus.RECRUITING,
          listingLifecycleStatus: ClinicalTrialListingLifecycleStatus.RECRUITING,
          minimumAgeYears: 18,
          maximumAgeYears: 65,
          locationSummary: 'St. Johns',
          listingIsNotRegulatoryApproval: true,
          discoveryIsNotRecommendation: true,
          phaseReference: { code: 'PHASE_3', label: 'Phase 3' },
          conditionReference: { code: 'COND-1', label: 'Condition', categoryCode: 'ONCOLOGY' },
          interventionReference: { code: 'INT-1', label: 'Intervention' },
          sponsor: { displayName: 'Public Health Agency', sponsorReference: 'SP-1' },
          currentTrialVersion: {
            title: 'Trial title',
            publicSummary: 'Summary',
            broadEligibilitySummary: 'Adults',
          },
          eligibilityCriteria: [],
        },
      ]);

      const result = await discovery.discoverRecruitingTrials();
      expect(result.participantDataIncluded).toBe(false);
      expect(result.trials).toHaveLength(1);
      const trialsPayload = JSON.stringify(result.trials);
      expect(trialsPayload).not.toContain('participantProfileId');
      expect(trialsPayload).not.toContain('subjectIdentityId');
    });
  });

  describe('ResearchEthicsApprovalService', () => {
    const prisma = {
      researchEthicsApproval: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
        fn({
          researchEthicsApprovalVersion: { create: jest.fn() },
          researchEthicsApproval: { update: jest.fn() },
        }),
      ),
    };

    let ethics: ResearchEthicsApprovalService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ResearchEthicsApprovalService,
          ClinicalResearchBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      ethics = module.get(ResearchEthicsApprovalService);
      jest.clearAllMocks();
    });

    it('blocks sponsor ethics self-approval recording', async () => {
      await expect(
        ethics.recordEthicsApprovalVersion({
          researchEthicsApprovalId: 'eth-1',
          actorPersona: ClinicalResearchActorPersona.TRIAL_SPONSOR,
          action: 'MARK_ETHICS_APPROVED',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('ClinicalTrialProtocolVersionService', () => {
    const prisma = {
      clinicalTrialProtocol: {
        findUnique: jest.fn(),
      },
      clinicalTrialProtocolVersion: {
        create: jest.fn(),
      },
    };

    let protocol: ClinicalTrialProtocolVersionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ClinicalTrialProtocolVersionService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      protocol = module.get(ClinicalTrialProtocolVersionService);
      jest.clearAllMocks();
    });

    it('protocol amendment creates new version', async () => {
      prisma.clinicalTrialProtocol.findUnique.mockResolvedValue({
        id: 'proto-1',
        versions: [{ versionNumber: 1, isImmutable: true }],
      });
      prisma.clinicalTrialProtocolVersion.create.mockResolvedValue({
        id: 'pv-2',
        versionNumber: 2,
        isImmutable: false,
      });

      const created = await protocol.createAmendmentVersion({
        protocolId: 'proto-1',
        amendmentSummary: 'Safety monitoring update',
      });

      expect(created.versionNumber).toBe(2);
      expect(prisma.clinicalTrialProtocolVersion.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('ClinicalTrialEnrollmentService', () => {
    const prisma = {
      clinicalTrial: { findUnique: jest.fn() },
      clinicalTrialSite: { findUnique: jest.fn() },
      clinicalTrialProtocolVersion: { findUnique: jest.fn() },
      clinicalTrialConsentVersion: { findUnique: jest.fn() },
      clinicalTrialEligibilityAssessment: { findUnique: jest.fn() },
      clinicalTrialConsentSignature: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    let enrollment: ClinicalTrialEnrollmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ClinicalTrialEnrollmentService,
          ClinicalResearchBoundaryService,
          ResearchEthicsApprovalService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      enrollment = module.get(ClinicalTrialEnrollmentService);
      jest.clearAllMocks();
    });

    const baseTrial = {
      id: 'trial-1',
      listingLifecycleStatus: ClinicalTrialListingLifecycleStatus.RECRUITING,
      recruitmentStatus: ClinicalTrialRecruitmentStatus.RECRUITING,
      ethicsApprovals: [
        {
          status: ResearchEthicsApprovalStatus.APPROVED,
          blocksEnrollmentWhenInactive: true,
          currentVersion: { expiresAt: null },
        },
      ],
      regulatoryApprovals: [
        {
          status: ClinicalRegulatoryApprovalStatus.AUTHORIZED,
          blocksEnrollmentWhenInactive: true,
        },
      ],
    };

    const baseEnrollmentPayload = {
      enrollmentReference: 'CTEN-1',
      clinicalTrialId: 'trial-1',
      clinicalTrialSiteId: 'site-1',
      participantProfileId: 'part-1',
      protocolVersionId: 'pv-1',
      consentVersionId: 'cv-1',
      eligibilityAssessmentId: 'ea-1',
      consentSignatureId: 'cs-1',
    };

    beforeEach(() => {
      prisma.clinicalTrial.findUnique.mockResolvedValue(baseTrial);
      prisma.clinicalTrialSite.findUnique.mockResolvedValue({
        id: 'site-1',
        clinicalTrialId: 'trial-1',
        isActive: true,
      });
      prisma.clinicalTrialProtocolVersion.findUnique.mockResolvedValue({
        id: 'pv-1',
        isActive: true,
        protocol: { clinicalTrialId: 'trial-1' },
      });
      prisma.clinicalTrialConsentVersion.findUnique.mockResolvedValue({
        id: 'cv-1',
        isActive: true,
        consent: { clinicalTrialId: 'trial-1' },
      });
    });

    it('expired/suspended ethics approval blocks new enrollment where configured', async () => {
      prisma.clinicalTrial.findUnique.mockResolvedValue({
        ...baseTrial,
        ethicsApprovals: [
          {
            status: ResearchEthicsApprovalStatus.SUSPENDED,
            blocksEnrollmentWhenInactive: true,
            currentVersion: { expiresAt: null },
          },
        ],
      });
      prisma.clinicalTrialEligibilityAssessment.findUnique.mockResolvedValue({
        id: 'ea-1',
        outcome: ClinicalTrialEligibilityAssessmentOutcome.DETERMINED_MEETS_PROFESSIONAL_CRITERIA,
        screening: { clinicalTrialId: 'trial-1' },
      });
      prisma.clinicalTrialConsentSignature.findUnique.mockResolvedValue({
        id: 'cs-1',
        consentVersionId: 'cv-1',
        status: ClinicalTrialConsentSignatureStatus.SIGNED,
      });

      await expect(enrollment.enrollParticipant(baseEnrollmentPayload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('suspended trial blocks enrollment', async () => {
      prisma.clinicalTrial.findUnique.mockResolvedValue({
        ...baseTrial,
        listingLifecycleStatus: ClinicalTrialListingLifecycleStatus.SUSPENDED,
        recruitmentStatus: ClinicalTrialRecruitmentStatus.SUSPENDED,
      });
      prisma.clinicalTrialEligibilityAssessment.findUnique.mockResolvedValue({
        id: 'ea-1',
        outcome: ClinicalTrialEligibilityAssessmentOutcome.DETERMINED_MEETS_PROFESSIONAL_CRITERIA,
        screening: { clinicalTrialId: 'trial-1' },
      });
      prisma.clinicalTrialConsentSignature.findUnique.mockResolvedValue({
        id: 'cs-1',
        consentVersionId: 'cv-1',
        status: ClinicalTrialConsentSignatureStatus.SIGNED,
      });

      await expect(enrollment.enrollParticipant(baseEnrollmentPayload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('enrollment records exact protocol/consent version', async () => {
      prisma.clinicalTrialEligibilityAssessment.findUnique.mockResolvedValue({
        id: 'ea-1',
        outcome: ClinicalTrialEligibilityAssessmentOutcome.DETERMINED_MEETS_PROFESSIONAL_CRITERIA,
        screening: { clinicalTrialId: 'trial-1' },
      });
      prisma.clinicalTrialConsentSignature.findUnique.mockResolvedValue({
        id: 'cs-1',
        consentVersionId: 'cv-1',
        status: ClinicalTrialConsentSignatureStatus.SIGNED,
      });

      const createdEnrollment = {
        id: 'enr-1',
        protocolVersionId: 'pv-1',
        consentVersionId: 'cv-1',
        status: ClinicalTrialEnrollmentStatus.ENROLLED,
      };

      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        Promise.resolve(
          fn({
            clinicalTrialEnrollment: {
              create: jest.fn().mockResolvedValue(createdEnrollment),
            },
            clinicalTrialEnrollmentStatusHistory: {
              create: jest.fn().mockResolvedValue({}),
            },
          }),
        ),
      );

      const result = await enrollment.enrollParticipant(baseEnrollmentPayload);
      expect(result.protocolVersionId).toBe('pv-1');
      expect(result.consentVersionId).toBe('cv-1');
    });
  });

  describe('ClinicalTrialWithdrawalService', () => {
    const prisma = {
      clinicalTrialEnrollment: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    let withdrawal: ClinicalTrialWithdrawalService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ClinicalTrialWithdrawalService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      withdrawal = module.get(ClinicalTrialWithdrawalService);
      jest.clearAllMocks();
    });

    it('patient may withdraw according to workflow and withdrawal preserves history', async () => {
      prisma.clinicalTrialEnrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        status: ClinicalTrialEnrollmentStatus.ENROLLED,
        withdrawal: null,
        statusHistory: [{ id: 'hist-1' }],
      });

      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        Promise.resolve(
          fn({
            clinicalTrialWithdrawal: {
              create: jest.fn().mockResolvedValue({
                id: 'wd-1',
                preservesParticipationHistory: true,
              }),
            },
            clinicalTrialEnrollment: {
              update: jest
                .fn()
                .mockResolvedValue({ status: ClinicalTrialEnrollmentStatus.WITHDRAWN }),
            },
            clinicalTrialEnrollmentStatusHistory: {
              create: jest.fn().mockResolvedValue({}),
              count: jest.fn().mockResolvedValue(2),
            },
          }),
        ),
      );

      const result = await withdrawal.withdrawParticipant({
        enrollmentId: 'enr-1',
        reasonCategory: 'PARTICIPANT_REQUEST',
        reasonSummary: 'Participant chose to withdraw',
        recordedByPersona: ClinicalResearchActorPersona.PARTICIPANT,
      });

      expect(result.participationHistoryPreserved).toBe(true);
      expect(result.priorStatusHistoryCount).toBe(1);
    });
  });

  describe('ClinicalResearchAccessService', () => {
    let access: ClinicalResearchAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ClinicalResearchAccessService, ClinicalResearchBoundaryService],
      }).compile();
      access = module.get(ClinicalResearchAccessService);
    });

    it('participant data isolated from other participants', () => {
      expect(() =>
        access.filterParticipantScopedRows(
          [{ participantProfileId: 'a' }, { participantProfileId: 'b' }],
          'a',
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
