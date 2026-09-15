import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AcceptanceDecisionOutcome,
  AcceptanceDossierVersionStatus,
  AcceptanceLevel,
  AcceptanceReviewClass,
  ActivationScopeType,
  AuthorityEvaluationOutcome,
  FeatureActivationStatus,
  IdentityType,
  ProductionActivationDecisionOutcome,
  ProductionActivationRequestStatus,
  ResidualRiskDecision,
  ResidualRiskStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../database/prisma.service';
import { AI_ACTOR_IDENTITY_PREFIX } from '../evidence/evidence.constants';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { FeatureActivationService } from './feature-activation/feature-activation.service';
import { AcceptanceDecisionService } from './institutional-acceptance/acceptance-decision.service';
import { AcceptanceReviewService } from './institutional-acceptance/acceptance-review.service';
import { InstitutionalAcceptanceDossierService } from './institutional-acceptance/institutional-acceptance-dossier.service';
import { ProductionActivationService } from './institutional-acceptance/production-activation.service';
import { ResidualRiskService } from './institutional-acceptance/residual-risk.service';

describe('Phase 13G must-fail gates', () => {
  describe('ProductionReadinessBoundaryService', () => {
    let boundary: ProductionReadinessBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ProductionReadinessBoundaryService],
      }).compile();
      boundary = module.get(ProductionReadinessBoundaryService);
    });

    it('rejects client setting protected acceptance fields', () => {
      expect(() => {
        boundary.rejectClientProtectedFields({ productionActivated: true });
      }).toThrow(BadRequestException);
    });

    it('blocks AI from accepting dossier', () => {
      expect(() => {
        boundary.assertAiCannotAcceptDossier(`${AI_ACTOR_IDENTITY_PREFIX}bot`);
      }).toThrow(ForbiddenException);
    });

    it('blocks AI from accepting residual risk', () => {
      expect(() => {
        boundary.assertAiCannotAcceptResidualRisk(`${AI_ACTOR_IDENTITY_PREFIX}bot`);
      }).toThrow(ForbiddenException);
    });

    it('blocks AI from activating production', () => {
      expect(() => {
        boundary.assertAiCannotActivateProduction(`${AI_ACTOR_IDENTITY_PREFIX}bot`);
      }).toThrow(ForbiddenException);
    });

    it('blocks developer from institutionally accepting own delivery', () => {
      expect(() => {
        boundary.assertDeveloperCannotInstitutionallyAcceptOwnDelivery('dev-1', 'dev-1');
      }).toThrow(ForbiddenException);
    });

    it('blocks vendor delivery as acceptance basis', () => {
      expect(() => {
        boundary.assertForbiddenAcceptanceBasis('VENDOR_DELIVERY');
      }).toThrow(BadRequestException);
    });

    it('blocks payment milestone as acceptance basis', () => {
      expect(() => {
        boundary.assertForbiddenAcceptanceBasis('PAYMENT_MILESTONE');
      }).toThrow(BadRequestException);
    });

    it('blocks training completion as acceptance basis', () => {
      expect(() => {
        boundary.assertForbiddenAcceptanceBasis('TRAINING_COMPLETION');
      }).toThrow(BadRequestException);
    });

    it('blocks passed tests as acceptance basis', () => {
      expect(() => {
        boundary.assertForbiddenAcceptanceBasis('PASSED_TESTS');
      }).toThrow(BadRequestException);
    });

    it('blocks technical production acceptance as institutional acceptance', () => {
      expect(() => {
        boundary.assertForbiddenAcceptanceBasis('TECHNICAL_PRODUCTION_ACCEPTANCE');
      }).toThrow(BadRequestException);
    });

    it('blocks institutional acceptance from equaling activation', () => {
      expect(() => {
        boundary.assertInstitutionalAcceptanceDoesNotEqualActivation(AcceptanceLevel.INSTITUTIONAL);
      }).toThrow(BadRequestException);
    });
  });

  describe('InstitutionalAcceptanceDossierService', () => {
    let dossierService: InstitutionalAcceptanceDossierService;
    let prisma: {
      acceptanceDossierVersion: { findUnique: jest.Mock; update: jest.Mock };
      acceptanceLevelAchievement: { findUnique: jest.Mock; create: jest.Mock };
    };

    beforeEach(async () => {
      prisma = {
        acceptanceDossierVersion: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        acceptanceLevelAchievement: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          InstitutionalAcceptanceDossierService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      dossierService = module.get(InstitutionalAcceptanceDossierService);
    });

    it('does not auto-create higher acceptance level', async () => {
      prisma.acceptanceDossierVersion.findUnique.mockResolvedValue({
        id: 'ver-1',
        status: AcceptanceDossierVersionStatus.DRAFT,
      });
      prisma.acceptanceLevelAchievement.findUnique.mockResolvedValue({
        id: 'lvl-1',
      });

      await expect(
        dossierService.recordAcceptanceLevel({
          dossierVersionId: 'ver-1',
          acceptanceLevel: AcceptanceLevel.INSTITUTIONAL,
          achievedByIdentityId: 'human-1',
        }),
      ).rejects.toThrow('already recorded');
    });

    it('blocks mutation of signed dossier version', async () => {
      prisma.acceptanceDossierVersion.findUnique.mockResolvedValue({
        id: 'ver-1',
        status: AcceptanceDossierVersionStatus.FROZEN_ACCEPTED,
      });

      await expect(
        dossierService.recordAcceptanceLevel({
          dossierVersionId: 'ver-1',
          acceptanceLevel: AcceptanceLevel.TEST,
          achievedByIdentityId: 'human-1',
        }),
      ).rejects.toThrow('immutable');
    });
  });

  describe('AcceptanceDecisionService', () => {
    let decisionService: AcceptanceDecisionService;
    let prisma: Record<string, unknown>;
    let authorityEvaluation: { evaluate: jest.Mock };

    beforeEach(async () => {
      authorityEvaluation = {
        evaluate: jest.fn().mockResolvedValue({
          evaluationId: 'auth-1',
          outcome: AuthorityEvaluationOutcome.ALLOW,
        }),
      };

      prisma = {
        identity: {
          findUnique: jest.fn().mockResolvedValue({ id: 'human-1', type: IdentityType.INDIVIDUAL }),
        },
        acceptanceDossierVersion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ver-1',
            status: AcceptanceDossierVersionStatus.SUBMITTED_FOR_FINAL_ACCEPTANCE,
            acceptanceAuthorityFunctionRecordId: 'func-1',
            dossier: { id: 'dos-1' },
          }),
        },
        $transaction: jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            acceptanceDecision: {
              create: jest.fn().mockResolvedValue({ id: 'dec-1' }),
            },
            acceptanceSignature: { create: jest.fn() },
            acceptanceCondition: { createMany: jest.fn() },
            acceptanceDossierVersion: { update: jest.fn() },
            acceptanceLevelAchievement: { upsert: jest.fn() },
          }),
        ),
      };

      const module = await Test.createTestingModule({
        providers: [
          AcceptanceDecisionService,
          AcceptanceReviewService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();

      decisionService = module.get(AcceptanceDecisionService);

      jest
        .spyOn(module.get(AcceptanceReviewService), 'assertRequiredReviewsSatisfactory')
        .mockResolvedValue(undefined);
    });

    it('blocks AI from accepting dossier', async () => {
      await expect(
        decisionService.recordDecision({
          dossierVersionId: 'ver-1',
          outcome: AcceptanceDecisionOutcome.ACCEPTED,
          acceptanceLevel: AcceptanceLevel.INSTITUTIONAL,
          decidedByOfficeholderId: 'off-1',
          actorIdentityId: `${AI_ACTOR_IDENTITY_PREFIX}bot`,
        }),
      ).rejects.toThrow('AI cannot accept');
    });

    it('blocks unauthorized official', async () => {
      authorityEvaluation.evaluate.mockResolvedValue({
        evaluationId: 'auth-deny',
        outcome: AuthorityEvaluationOutcome.DENY,
      });

      await expect(
        decisionService.recordDecision({
          dossierVersionId: 'ver-1',
          outcome: AcceptanceDecisionOutcome.ACCEPTED,
          acceptanceLevel: AcceptanceLevel.INSTITUTIONAL,
          decidedByOfficeholderId: 'off-1',
          actorIdentityId: 'human-1',
        }),
      ).rejects.toThrow('Unauthorized');
    });

    it('blocks developer self-acceptance', async () => {
      await expect(
        decisionService.recordDecision({
          dossierVersionId: 'ver-1',
          outcome: AcceptanceDecisionOutcome.ACCEPTED,
          acceptanceLevel: AcceptanceLevel.INSTITUTIONAL,
          decidedByOfficeholderId: 'off-1',
          actorIdentityId: 'dev-1',
          technicalImplementerIdentityId: 'dev-1',
        }),
      ).rejects.toThrow('Technical implementer');
    });
  });

  describe('ResidualRiskService', () => {
    let riskService: ResidualRiskService;
    let authorityEvaluation: { evaluate: jest.Mock };
    let prisma: {
      residualRisk: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
      $transaction: jest.Mock;
    };

    beforeEach(async () => {
      authorityEvaluation = {
        evaluate: jest.fn().mockResolvedValue({
          evaluationId: 'auth-1',
          outcome: AuthorityEvaluationOutcome.ALLOW,
        }),
      };

      prisma = {
        residualRisk: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'risk-1',
            riskAcceptanceAuthorityFunctionRecordId: 'func-1',
          }),
          findMany: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            residualRiskAcceptance: {
              create: jest.fn().mockResolvedValue({ id: 'acc-1' }),
            },
            acceptanceCondition: { createMany: jest.fn() },
            residualRisk: { update: jest.fn() },
          }),
        ),
      };

      const module = await Test.createTestingModule({
        providers: [
          ResidualRiskService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();

      riskService = module.get(ResidualRiskService);
    });

    it('blocks AI from accepting residual risk', async () => {
      await expect(
        riskService.recordRiskAcceptance({
          residualRiskId: 'risk-1',
          decision: ResidualRiskDecision.ACCEPT,
          decidedByOfficeholderId: 'off-1',
          decidedByIdentityId: `${AI_ACTOR_IDENTITY_PREFIX}bot`,
        }),
      ).rejects.toThrow('AI cannot accept residual risk');
    });

    it('blocks developer generic risk acceptance', async () => {
      await expect(
        riskService.recordRiskAcceptance({
          residualRiskId: 'risk-1',
          decision: ResidualRiskDecision.ACCEPT,
          decidedByOfficeholderId: 'off-1',
          decidedByIdentityId: 'dev-1',
          technicalImplementerIdentityId: 'dev-1',
        }),
      ).rejects.toThrow('Technical implementer');
    });

    it('blocks activation when critical residual risk unaccepted', async () => {
      prisma.residualRisk.findMany = jest.fn().mockResolvedValue([
        { id: 'risk-1', status: ResidualRiskStatus.OPEN, isCritical: true },
      ]);

      await expect(riskService.assertCriticalRisksAccepted('ver-1')).rejects.toThrow(
        'Unaccepted critical residual risk',
      );
    });
  });

  describe('ProductionActivationService', () => {
    let activationService: ProductionActivationService;
    let authorityEvaluation: { evaluate: jest.Mock };
    let prisma: {
      productionActivationRequest: { findUnique: jest.Mock; update: jest.Mock };
      productionActivationDecision: { findUnique: jest.Mock; create: jest.Mock };
      activationScope: { createMany: jest.Mock };
      activationAuditRecord: { create: jest.Mock };
      activationCommunication: { create: jest.Mock };
      residualRisk: { findMany: jest.Mock };
      $transaction: jest.Mock;
    };

    const baseRequest = {
      id: 'req-1',
      dossierVersionId: 'ver-1',
      acceptedReleaseReference: 'rel-1.0',
      environment: 'production',
      status: ProductionActivationRequestStatus.SUBMITTED,
      dossierVersion: {
        id: 'ver-1',
        status: AcceptanceDossierVersionStatus.FROZEN_ACCEPTED,
        releaseReference: 'rel-1.0',
        levelAchievements: [{ acceptanceLevel: AcceptanceLevel.INSTITUTIONAL }],
        dependencies: [],
        conditions: [],
      },
      scopes: [
        {
          id: 'scope-1',
          scopeType: ActivationScopeType.SERVICE,
          scopeReference: 'svc-1',
          scopeLabel: 'Service One',
        },
      ],
      decision: null,
    };

    beforeEach(async () => {
      authorityEvaluation = {
        evaluate: jest.fn().mockResolvedValue({
          evaluationId: 'auth-1',
          outcome: AuthorityEvaluationOutcome.ALLOW,
        }),
      };

      prisma = {
        productionActivationRequest: {
          findUnique: jest.fn().mockResolvedValue(baseRequest),
          update: jest.fn(),
        },
        productionActivationDecision: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        activationScope: { createMany: jest.fn() },
        activationAuditRecord: { create: jest.fn() },
        activationCommunication: { create: jest.fn() },
        residualRisk: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        $transaction: jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            productionActivationDecision: {
              create: jest.fn().mockResolvedValue({ id: 'dec-1', replaySnapshot: {} }),
            },
            activationScope: { createMany: jest.fn() },
            productionActivationRequest: { update: jest.fn() },
            activationAuditRecord: { create: jest.fn() },
          }),
        ),
      };

      const module = await Test.createTestingModule({
        providers: [
          ProductionActivationService,
          ResidualRiskService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();

      activationService = module.get(ProductionActivationService);
    });

    it('blocks activation without explicit scope', async () => {
      await expect(
        activationService.createActivationRequest({
          requestNumber: 'PAR-1',
          dossierId: 'dos-1',
          dossierVersionId: 'ver-1',
          acceptedReleaseReference: 'rel-1.0',
          environment: 'production',
          effectiveDate: new Date(),
          scopes: [],
        }),
      ).rejects.toThrow('explicit scope');
    });

    it('blocks institutional acceptance from equaling activation', async () => {
      const dossierPrisma = {
        acceptanceDossierVersion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ver-1',
            status: AcceptanceDossierVersionStatus.DRAFT,
            releaseReference: 'rel-1.0',
            levelAchievements: [{ acceptanceLevel: AcceptanceLevel.INSTITUTIONAL }],
            decisions: [],
          }),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          ProductionActivationService,
          ResidualRiskService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: dossierPrisma },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();

      const service = module.get(ProductionActivationService);

      await expect(
        service.createActivationRequest({
          requestNumber: 'PAR-1',
          dossierId: 'dos-1',
          dossierVersionId: 'ver-1',
          acceptedReleaseReference: 'rel-1.0',
          environment: 'production',
          effectiveDate: new Date(),
          scopes: [
            {
              scopeType: ActivationScopeType.SERVICE,
              scopeReference: 'svc-1',
              scopeLabel: 'Service One',
            },
          ],
        }),
      ).rejects.toThrow('frozen institutional acceptance');
    });

    it('blocks unverified continuity readiness', async () => {
      await expect(
        activationService.recordActivationDecision({
          activationRequestId: 'req-1',
          outcome: ProductionActivationDecisionOutcome.APPROVED,
          decidedByOfficeholderId: 'off-1',
          decidedByIdentityId: 'human-1',
          activationAuthorityFunctionRecordId: 'func-1',
          securityPrivacyStatus: 'CURRENT',
          recordsControlsStatus: 'CURRENT',
          continuityReadinessVerified: false,
          workforceQualified: true,
          integrationsAccepted: true,
          residualRisksAccepted: true,
          monitoringConfigured: true,
          rollbackCapable: true,
        }),
      ).rejects.toThrow('continuity');
    });

    it('blocks unqualified workforce', async () => {
      await expect(
        activationService.recordActivationDecision({
          activationRequestId: 'req-1',
          outcome: ProductionActivationDecisionOutcome.APPROVED,
          decidedByOfficeholderId: 'off-1',
          decidedByIdentityId: 'human-1',
          activationAuthorityFunctionRecordId: 'func-1',
          securityPrivacyStatus: 'CURRENT',
          recordsControlsStatus: 'CURRENT',
          continuityReadinessVerified: true,
          workforceQualified: false,
          integrationsAccepted: true,
          residualRisksAccepted: true,
          monitoringConfigured: true,
          rollbackCapable: true,
        }),
      ).rejects.toThrow('operator');
    });

    it('blocks activation exceeding dossier scope', async () => {
      await expect(
        activationService.recordActivationDecision({
          activationRequestId: 'req-1',
          outcome: ProductionActivationDecisionOutcome.APPROVED,
          decidedByOfficeholderId: 'off-1',
          decidedByIdentityId: 'human-1',
          activationAuthorityFunctionRecordId: 'func-1',
          securityPrivacyStatus: 'CURRENT',
          recordsControlsStatus: 'CURRENT',
          continuityReadinessVerified: true,
          workforceQualified: true,
          integrationsAccepted: true,
          residualRisksAccepted: true,
          monitoringConfigured: true,
          rollbackCapable: true,
          approvedScopes: [
            {
              scopeType: ActivationScopeType.DEPARTMENT,
              scopeReference: 'dept-99',
              scopeLabel: 'Out of scope',
            },
          ],
        }),
      ).rejects.toThrow('exceed dossier scope');
    });

    it('blocks AI from activating production', async () => {
      await expect(
        activationService.recordActivationDecision({
          activationRequestId: 'req-1',
          outcome: ProductionActivationDecisionOutcome.APPROVED,
          decidedByOfficeholderId: 'off-1',
          decidedByIdentityId: `${AI_ACTOR_IDENTITY_PREFIX}bot`,
          activationAuthorityFunctionRecordId: 'func-1',
          securityPrivacyStatus: 'CURRENT',
          recordsControlsStatus: 'CURRENT',
          continuityReadinessVerified: true,
          workforceQualified: true,
          integrationsAccepted: true,
          residualRisksAccepted: true,
          monitoringConfigured: true,
          rollbackCapable: true,
        }),
      ).rejects.toThrow('AI cannot activate');
    });

    it('records communication without creating activation', async () => {
      prisma.productionActivationDecision.findUnique = jest.fn().mockResolvedValue({
        id: 'dec-1',
      });
      prisma.activationCommunication.create = jest.fn().mockResolvedValue({
        id: 'comm-1',
        audienceType: 'STAFF',
      });

      const communication = await activationService.recordCommunication(
        'dec-1',
        'STAFF',
        'COMM-001',
        'human-1',
      );

      expect(communication.id).toBe('comm-1');
      expect(prisma.activationCommunication.create).toHaveBeenCalled();
    });

    it('supports fully replayable activation decision', async () => {
      prisma.productionActivationDecision.findUnique = jest.fn().mockResolvedValue({
        id: 'dec-1',
        outcome: ProductionActivationDecisionOutcome.APPROVED,
        replaySnapshot: { requestId: 'req-1' },
        restrictions: ['PILOT_ONLY'],
        scopes: [],
        authorityEvaluationRecordId: 'auth-1',
        freshAuthorityEvaluationRecordId: 'auth-2',
        activationRequest: { scopes: [], dossierVersion: {} },
      });

      const replay = await activationService.replayDecision('dec-1');
      expect(replay.replayable).toBe(true);
      expect(replay.replaySnapshot).toEqual({ requestId: 'req-1' });
    });
  });

  describe('FeatureActivationService', () => {
    let featureService: FeatureActivationService;
    let prisma: {
      featureActivation: { findUnique: jest.Mock; update: jest.Mock; upsert: jest.Mock };
      productionActivationDecision: { findUnique: jest.Mock };
      activationAuditRecord: { create: jest.Mock };
      $transaction: jest.Mock;
    };

    beforeEach(async () => {
      prisma = {
        featureActivation: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'feat-1',
            status: FeatureActivationStatus.DEPLOYED,
            environment: 'production',
            releaseReference: 'rel-1.0',
          }),
          update: jest.fn().mockResolvedValue({
            id: 'feat-1',
            status: FeatureActivationStatus.OPERATIONALLY_AVAILABLE,
          }),
          upsert: jest.fn(),
        },
        productionActivationDecision: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'dec-1',
            outcome: ProductionActivationDecisionOutcome.APPROVED,
            scopes: [{ id: 'scope-1' }],
            activationRequest: {
              environment: 'production',
              acceptedReleaseReference: 'rel-1.0',
            },
          }),
        },
        activationAuditRecord: { create: jest.fn() },
        $transaction: jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            featureActivation: {
              update: jest.fn().mockResolvedValue({
                id: 'feat-1',
                status: FeatureActivationStatus.OPERATIONALLY_AVAILABLE,
              }),
            },
            activationAuditRecord: { create: jest.fn() },
          }),
        ),
      };

      const module = await Test.createTestingModule({
        providers: [FeatureActivationService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      featureService = module.get(FeatureActivationService);
    });

    it('requires approved activation to transition feature', async () => {
      prisma.productionActivationDecision.findUnique = jest.fn().mockResolvedValue({
        id: 'dec-1',
        outcome: ProductionActivationDecisionOutcome.REJECTED,
        scopes: [{ id: 'scope-1' }],
        activationRequest: {
          environment: 'production',
          acceptedReleaseReference: 'rel-1.0',
        },
      });

      await expect(
        featureService.transitionToOperationallyAvailable({
          featureActivationId: 'feat-1',
          productionActivationDecisionId: 'dec-1',
          activationScopeId: 'scope-1',
          actorIdentityId: 'human-1',
        }),
      ).rejects.toThrow('approved production activation');
    });

    it('transitions feature only with approved scope', async () => {
      const result = await featureService.transitionToOperationallyAvailable({
        featureActivationId: 'feat-1',
        productionActivationDecisionId: 'dec-1',
        activationScopeId: 'scope-1',
        actorIdentityId: 'human-1',
      });

      expect(result.status).toBe(FeatureActivationStatus.OPERATIONALLY_AVAILABLE);
    });
  });

  describe('AcceptanceReviewService', () => {
    it('configures only applicable review classes', async () => {
      const prisma = {
        acceptanceDossierVersion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ver-1',
            status: AcceptanceDossierVersionStatus.DRAFT,
          }),
        },
        acceptanceReview: {
          upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)),
        },
      };

      const module = await Test.createTestingModule({
        providers: [AcceptanceReviewService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const reviewService = module.get(AcceptanceReviewService);
      const reviews = await reviewService.configureApplicableReviews({
        dossierVersionId: 'ver-1',
        applicableReviewClasses: [
          AcceptanceReviewClass.SECURITY,
          AcceptanceReviewClass.CONTINUITY,
        ],
      });

      expect(reviews).toHaveLength(2);
      expect(prisma.acceptanceReview.upsert).toHaveBeenCalledTimes(2);
    });

    it('keeps conditional acceptance deadlines visible', async () => {
      const deadline = new Date('2026-12-31');
      const prisma = {
        acceptanceCondition: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'cond-1',
              conditionText: 'Complete workforce qualification',
              deadline,
              status: 'OPEN',
            },
          ]),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          AcceptanceDecisionService,
          AcceptanceReviewService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuthorityEvaluationService, useValue: { evaluate: jest.fn() } },
        ],
      }).compile();

      const decisionService = module.get(AcceptanceDecisionService);
      const conditions = await decisionService.getOpenConditions('ver-1');

      expect(conditions[0]?.deadline).toEqual(deadline);
      expect(conditions[0]?.status).toBe('OPEN');
    });
  });
});
