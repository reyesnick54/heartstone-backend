import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ConsequentialUseReviewDecision,
  DigitalTwinMode,
  DigitalTwinType,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { ConsequentialUseService } from './consequential-use/consequential-use.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { SimulationService } from './simulation/simulation.service';

describe('Phase 12F must-fail gates', () => {
  describe('IntelligenceBoundaryService', () => {
    let boundary: IntelligenceBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [IntelligenceBoundaryService],
      }).compile();
      boundary = module.get(IntelligenceBoundaryService);
    });

    it('rejects authoritative twin marker', () => {
      expect(() => {
        boundary.assertTwinIsNotAuthoritativeRecord({ isAuthoritativeRecord: true });
      }).toThrow(BadRequestException);
    });

    it('rejects scenario presented as prediction', () => {
      expect(() => {
        boundary.assertScenarioNotPrediction(true);
      }).toThrow(BadRequestException);
      expect(() => {
        boundary.assertOutputNotPresentedAsPrediction(true);
      }).toThrow(BadRequestException);
    });

    it('rejects simulation mutating live records', () => {
      expect(() => {
        boundary.assertSimulationCannotMutateLive('GovernmentDecision');
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertSimulationActionForbidden('ISSUE_LICENSE');
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertSimulationActionForbidden('CHANGE_PROJECT_STAGE');
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertSimulationActionForbidden('SEND_PUBLIC_EVENT_NOTICE');
      }).toThrow(ForbiddenException);
    });

    it('blocks consequential use for stale twin', () => {
      expect(() => {
        boundary.assertTwinIntegrityForConsequentialUse({
          isStale: true,
          isIncomplete: false,
          isInconsistent: false,
          isCompromised: false,
          outsideApprovedUse: false,
          isAuthoritativeRecord: false,
        });
      }).toThrow(ForbiddenException);
    });

    it('blocks undisclosed sources', () => {
      expect(() => {
        boundary.assertSourcesDisclosedForConsequentialUse({
          sources: [{ isDisclosed: false, sourceStatus: 'MODELED' }],
        });
      }).toThrow(ForbiddenException);
    });

    it('rejects AI final consequential decisions', () => {
      expect(() => {
        boundary.assertHumanReviewerForConsequentialUse(IdentityType.SERVICE, 'AI_ASSISTANCE');
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertAiCannotFinalDecide('FINAL_DECIDE', true);
      }).toThrow(ForbiddenException);
    });

    it('requires rollback and acceptance for live transition', () => {
      expect(() => {
        boundary.assertLiveTransitionRequiresAcceptance({
          institutionalAcceptanceReference: '',
          rollbackPlanReference: '',
          securityReviewCompleted: false,
          testingCompleted: false,
          trainingCompleted: false,
          liveActivationAuthorized: false,
          technicalSuccessAcknowledged: true,
        });
      }).toThrow(BadRequestException);
    });

    it('rejects operational control in phase 12', () => {
      expect(() => {
        boundary.assertModeIsNotOperationalControl(DigitalTwinMode.APPROVED_LIVE_REFERENCE, true);
      }).toThrow(ForbiddenException);
    });

    it('rejects client protected fields', () => {
      expect(() => {
        boundary.rejectClientProtectedFields({ isPrediction: true });
      }).toThrow(ForbiddenException);
    });

    it('requires modeled-only relationships', () => {
      expect(() => {
        boundary.assertRelationshipIsModeledOnly(false);
      }).toThrow(BadRequestException);
    });

    it('prevents case twin profile expansion', () => {
      expect(() => {
        boundary.assertCaseTwinPreventsProfileExpansion(DigitalTwinType.CASE, false);
      }).toThrow(BadRequestException);
    });
  });

  describe('SimulationService', () => {
    let service: SimulationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          SimulationService,
          IntelligenceBoundaryService,
          { provide: PrismaService, useValue: {} },
        ],
      }).compile();

      service = module.get(SimulationService);
    });

    it('attemptLiveMutation always fails before touching live systems', () => {
      expect(() =>
        service.attemptLiveMutation({
          target: 'Case',
          action: 'MUTATE_CASE_STATUS',
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('ConsequentialUseService', () => {
    const prisma = {
      digitalTwinVersion: {
        findUnique: jest.fn(),
      },
      consequentialUseReview: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    let service: ConsequentialUseService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ConsequentialUseService,
          IntelligenceBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(ConsequentialUseService);
      jest.clearAllMocks();
    });

    it('blocks consequential use when twin is stale', async () => {
      prisma.digitalTwinVersion.findUnique.mockResolvedValue({
        id: 'version-1',
        definition: {
          isStale: true,
          isIncomplete: false,
          isInconsistent: false,
          isCompromised: false,
          outsideApprovedUse: false,
          isAuthoritativeRecord: false,
        },
        sources: [{ isDisclosed: true, sourceStatus: 'MODELED' }],
      });

      await expect(
        service.recordReview({
          twinVersionId: 'version-1',
          representedSubjectType: DigitalTwinType.CASE,
          representedSubjectId: 'case-1',
          impactAreas: ['GOVERNMENT_DECISION'],
          reviewerIdentityId: 'identity-1',
          reviewerIdentityType: IdentityType.INDIVIDUAL,
          authorityReference: 'auth-1',
          decision: ConsequentialUseReviewDecision.APPROVED,
          reasons: 'test',
          limitations: 'test',
          proposedUse: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks consequential use when sources are undisclosed', async () => {
      prisma.digitalTwinVersion.findUnique.mockResolvedValue({
        id: 'version-1',
        definition: {
          isStale: false,
          isIncomplete: false,
          isInconsistent: false,
          isCompromised: false,
          outsideApprovedUse: false,
          isAuthoritativeRecord: false,
        },
        sources: [{ isDisclosed: false, sourceStatus: 'UNVERIFIED' }],
      });

      await expect(
        service.recordReview({
          twinVersionId: 'version-1',
          representedSubjectType: DigitalTwinType.CASE,
          representedSubjectId: 'case-1',
          impactAreas: ['PERSON'],
          reviewerIdentityId: 'identity-1',
          reviewerIdentityType: IdentityType.INDIVIDUAL,
          authorityReference: 'auth-1',
          decision: ConsequentialUseReviewDecision.APPROVED,
          reasons: 'test',
          limitations: 'test',
          proposedUse: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DigitalTwinService', () => {
    const prisma = {
      digitalTwinDefinition: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      digitalTwinVersion: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    let service: DigitalTwinService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DigitalTwinService,
          IntelligenceBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(DigitalTwinService);
      jest.clearAllMocks();
    });

    it('creates twins as non-authoritative records', async () => {
      prisma.digitalTwinDefinition.create.mockResolvedValue({
        id: 'twin-1',
        isAuthoritativeRecord: false,
      });

      const result = await service.createDefinition({
        twinCode: 'CASE-TWIN-1',
        representedSubjectType: DigitalTwinType.CASE,
        representedSubjectId: 'case-1',
        representedSubjectReference: 'case:case-1',
        institutionalOwnerId: 'inst-1',
        purpose: 'workflow simulation',
        scope: 'case processing',
        sourceRequirements: 'authoritative case record',
        preventsPersonalProfileExpansion: true,
      });

      expect(result.isAuthoritativeRecord).toBe(false);
      expect(prisma.digitalTwinDefinition.create).toHaveBeenCalledTimes(1);
    });
  });
});
