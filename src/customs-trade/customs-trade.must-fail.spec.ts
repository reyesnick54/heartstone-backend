import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdentityType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CustomsTradeAccessService } from './common/customs-trade-access.service';
import { CustomsTradeBoundaryService } from './common/customs-trade-boundary.service';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { CustomsAssessmentPaymentService } from './payments/customs-assessment-payment.service';
import { CustomsReleaseService } from './release/customs-release.service';
import { CustomsReleaseEligibilityService } from './release/customs-release-eligibility.service';
import { PublicCustomsTradeVerificationService } from './verification/public-customs-trade-verification.service';

describe('Customs & Trade must-fail gates', () => {
  describe('CustomsTradeBoundaryService', () => {
    let boundary: CustomsTradeBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CustomsTradeBoundaryService],
      }).compile();
      boundary = module.get(CustomsTradeBoundaryService);
    });

    it('blocks AI from executing cargo release', () => {
      expect(() => {
        boundary.assertAiCannotExecuteRelease(IdentityType.SERVICE);
      }).toThrow(ForbiddenException);
    });

    it('blocks AI recommendation actions that would release cargo', () => {
      expect(() => {
        boundary.assertAiCustomsActionForbidden('EXECUTE_CARGO_RELEASE');
      }).toThrow(ForbiddenException);
    });

    it('blocks payment side-effect implying release', () => {
      expect(() => {
        boundary.assertPaymentDoesNotRelease('payment recorded; cargo released');
      }).toThrow(BadRequestException);
    });

    it('requires authoritative release conditions', () => {
      expect(() => {
        boundary.assertReleaseAuthoritativeConditions({ reviewsComplete: true });
      }).toThrow(BadRequestException);
    });

    it('blocks destructive edit of locked declaration version', () => {
      expect(() => {
        boundary.assertSubmittedDeclarationVersionImmutable(new Date());
      }).toThrow(ForbiddenException);
    });
  });

  describe('CustomsTradeAccessService', () => {
    const prisma = {
      tradeShipment: { findFirst: jest.fn() },
      tradeAccessAudit: { create: jest.fn().mockResolvedValue({}) },
      representativeAuthority: { findUnique: jest.fn() },
    };

    let access: CustomsTradeAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CustomsTradeAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      access = module.get(CustomsTradeAccessService);
      jest.clearAllMocks();
    });

    it('denies access to another organization shipment', async () => {
      prisma.tradeShipment.findFirst.mockResolvedValue(null);

      await expect(
        access.assertShipmentAccess(
          'identity-1',
          'shipment-2',
          {
            organizationId: 'org-1',
            identityId: 'identity-1',
            hasActiveMembership: true,
            activeMembershipIds: ['mem-1'],
            activeRepresentativeAuthorityIds: [],
            hasFullOrganizationVisibility: true,
          },
          'test',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enforces broker representative scope on shipment queries', () => {
      const where = access.buildShipmentWhere({
        organizationId: 'org-1',
        identityId: 'broker-1',
        hasActiveMembership: false,
        activeMembershipIds: [],
        activeRepresentativeAuthorityIds: ['auth-1'],
        hasFullOrganizationVisibility: false,
      });

      expect(where).toEqual({
        organizationId: 'org-1',
        representativeAuthorityId: { in: ['auth-1'] },
      });
    });
  });

  describe('CustomsDeclarationService', () => {
    const prisma = {
      customsDeclaration: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customsDeclarationVersion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      tradeShipment: { update: jest.fn() },
    };

    let service: CustomsDeclarationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsDeclarationService,
          CustomsTradeBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CustomsDeclarationService);
      jest.clearAllMocks();
    });

    it('does not release cargo when submitting declaration', async () => {
      prisma.customsDeclaration.findUnique.mockResolvedValue({
        id: 'decl-1',
        shipmentId: 'ship-1',
        versions: [],
      });
      prisma.customsDeclarationVersion.create.mockResolvedValue({ id: 'v1', versionNumber: 1 });
      prisma.customsDeclaration.update.mockResolvedValue({});
      prisma.tradeShipment.update.mockResolvedValue({});

      const result = await service.submitInitialVersion({
        customsDeclarationId: 'decl-1',
        declarationData: { goods: 'widgets' },
        submittedByIdentityId: 'identity-1',
      });

      expect(result.cargoReleased).toBe(false);
    });

    it('creates a new version for amendment instead of mutating prior version', async () => {
      prisma.customsDeclaration.findUnique.mockResolvedValue({
        id: 'decl-1',
        currentVersion: { id: 'v1', versionNumber: 1 },
        versions: [{ versionNumber: 1 }],
      });
      prisma.customsDeclarationVersion.create.mockResolvedValue({
        id: 'v2',
        versionNumber: 2,
        isAmendment: true,
      });
      prisma.customsDeclaration.update.mockResolvedValue({});

      const result = await service.amendDeclaration({
        customsDeclarationId: 'decl-1',
        declarationData: { amended: true },
        submittedByIdentityId: 'identity-1',
      });

      expect(result.previousVersionId).toBe('v1');
      expect(prisma.customsDeclarationVersion.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('CustomsAssessmentPaymentService', () => {
    const prisma = {
      customsAssessment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customsAssessmentPayment: { create: jest.fn() },
    };

    let service: CustomsAssessmentPaymentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsAssessmentPaymentService,
          CustomsTradeBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CustomsAssessmentPaymentService);
      jest.clearAllMocks();
    });

    it('does not release cargo when recording payment', async () => {
      prisma.customsAssessment.findUnique.mockResolvedValue({
        id: 'assess-1',
        amountCents: 1000,
        paidAmountCents: 0,
      });
      prisma.customsAssessmentPayment.create.mockResolvedValue({
        id: 'pay-1',
        releaseTriggered: false,
      });
      prisma.customsAssessment.update.mockResolvedValue({});

      const result = await service.recordPayment({
        customsAssessmentId: 'assess-1',
        allocatedAmountCents: 500,
        paymentReference: 'PAY-1',
      });

      expect(result.cargoReleased).toBe(false);
      expect(result.releaseTriggered).toBe(false);
    });
  });

  describe('CustomsReleaseEligibilityService', () => {
    const prisma = {
      tradeShipment: { findUnique: jest.fn() },
      customsOfficialReleaseAuthority: { findFirst: jest.fn() },
    };

    let eligibility: CustomsReleaseEligibilityService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CustomsReleaseEligibilityService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      eligibility = module.get(CustomsReleaseEligibilityService);
      jest.clearAllMocks();
    });

    it('blocks release when an active hold exists', async () => {
      prisma.tradeShipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        releaseRecord: { status: 'NOT_RELEASED' },
        holds: [{ status: 'ACTIVE' }],
        permits: [],
        assessments: [],
        externalDependencies: [],
        documentDeficiencies: [],
        releaseReview: {
          declarationReviewStatus: 'COMPLETE',
          classificationReviewStatus: 'COMPLETE',
          valuationReviewStatus: 'COMPLETE',
          permitVerificationStatus: 'COMPLETE',
          riskReviewStatus: 'COMPLETE',
        },
        tradeOrganizationProfile: { jurisdictionId: 'jur-1' },
      });
      prisma.customsOfficialReleaseAuthority.findFirst.mockResolvedValue({ id: 'auth-1' });

      const result = await eligibility.evaluateShipmentRelease('ship-1', 'officeholder-1');
      expect(result.eligible).toBe(false);
      expect(result.conditions.holdsCleared).toBe(false);
    });

    it('blocks release when a required permit is unresolved', async () => {
      prisma.tradeShipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        releaseRecord: { status: 'NOT_RELEASED' },
        holds: [],
        permits: [{ status: 'REQUESTED', requiredForRelease: true }],
        assessments: [],
        externalDependencies: [],
        documentDeficiencies: [],
        releaseReview: {
          declarationReviewStatus: 'COMPLETE',
          classificationReviewStatus: 'COMPLETE',
          valuationReviewStatus: 'COMPLETE',
          permitVerificationStatus: 'COMPLETE',
          riskReviewStatus: 'COMPLETE',
        },
        tradeOrganizationProfile: { jurisdictionId: 'jur-1' },
      });
      prisma.customsOfficialReleaseAuthority.findFirst.mockResolvedValue({ id: 'auth-1' });

      const result = await eligibility.evaluateShipmentRelease('ship-1', 'officeholder-1');
      expect(result.eligible).toBe(false);
      expect(result.conditions.permitsSatisfied).toBe(false);
    });
  });

  describe('CustomsReleaseService', () => {
    const prisma = {
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
      customsReleaseRecord: { upsert: jest.fn().mockResolvedValue({}) },
      tradeShipment: { update: jest.fn().mockResolvedValue({}) },
    };

    const eligibility = {
      evaluateShipmentRelease: jest.fn(),
    };

    let release: CustomsReleaseService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsReleaseService,
          CustomsTradeBoundaryService,
          { provide: CustomsReleaseEligibilityService, useValue: eligibility },
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      release = module.get(CustomsReleaseService);
      jest.clearAllMocks();
    });

    it('rejects release for official without authority at execution', async () => {
      eligibility.evaluateShipmentRelease.mockResolvedValue({
        eligible: false,
        conditions: {
          reviewsComplete: true,
          officialReleaseAuthority: false,
          holdsCleared: true,
          permitsSatisfied: true,
          paymentConditionsSatisfied: true,
          externalDependenciesSatisfied: true,
          documentDeficienciesResolved: true,
        },
        blockingReasons: ['officialReleaseAuthority'],
      });

      await expect(
        release.executeCargoRelease({
          shipmentId: 'ship-1',
          officeholderId: 'officeholder-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not expose EXECUTE_CARGO_RELEASE on business action guard', () => {
      expect(() => {
        release.assertReleaseNotAvailableFromClientActionList('EXECUTE_CARGO_RELEASE');
      }).toThrow(BadRequestException);
    });
  });

  describe('PublicCustomsTradeVerificationService', () => {
    const prisma = {
      tradeOrganizationProfile: {
        findUnique: jest.fn(),
      },
    };

    let verification: PublicCustomsTradeVerificationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PublicCustomsTradeVerificationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      verification = module.get(PublicCustomsTradeVerificationService);
      jest.clearAllMocks();
    });

    it('returns only public facts for verification', async () => {
      prisma.tradeOrganizationProfile.findUnique.mockResolvedValue({
        profileReference: 'TRADE-ABC',
        ruleEnvironment: 'NON_PRODUCTION',
        importerStatus: 'ACTIVE',
        exporterStatus: 'NOT_REGISTERED',
      });

      const response = await verification.verify('TRADE-ABC');
      expect(response.publicFacts).toEqual({
        importerRegistered: true,
        exporterRegistered: false,
      });
      expect(JSON.stringify(response)).not.toContain('organizationId');
      expect(JSON.stringify(response)).not.toContain('declarationData');
    });
  });
});
