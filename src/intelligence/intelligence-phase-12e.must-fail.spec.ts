import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RiskEvidenceBasis } from '@prisma/client';

import { type PrismaService } from '../database/prisma.service';
import { AnalysisService } from './analysis/analysis.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { AI_ACTOR_IDENTITY_PREFIX, AI_ACTOR_ROLE_MARKER } from './intelligence.constants';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';

describe('Phase 12E must-fail invariants', () => {
  const boundary = new IntelligenceBoundaryService();

  describe('IntelligenceBoundaryService', () => {
    it('rejects analysis presented as final decision', () => {
      expect(() => {
        boundary.assertAnalysisNotDecision({
          isDecisionLike: true,
          presentationText: 'This is our final decision',
        });
      }).toThrow(BadRequestException);
    });

    it('rejects alert characterized as violation', () => {
      expect(() => {
        boundary.assertAlertNotViolationOrEmergency({ isViolation: true });
      }).toThrow(BadRequestException);
    });

    it('rejects alert characterized as emergency', () => {
      expect(() => {
        boundary.assertAlertNotViolationOrEmergency({ isEmergency: true });
      }).toThrow(BadRequestException);
    });

    it('rejects risk score claiming authority', () => {
      expect(() => {
        boundary.assertRiskScoreNotAuthority({ claimsAuthority: true });
      }).toThrow(BadRequestException);
    });

    it('rejects risk score bypassing mandatory gate', () => {
      expect(() => {
        boundary.assertRiskScoreCannotBypassGate({ scoreIsMandatoryGateBypass: true });
      }).toThrow(BadRequestException);
    });

    it('requires model estimate labeling', () => {
      expect(() => {
        boundary.assertModelEstimateLabeled(RiskEvidenceBasis.MODEL_ESTIMATE, 'estimate');
      }).toThrow(BadRequestException);
    });

    it('rejects averaged conflict resolution', () => {
      expect(() => {
        boundary.rejectAveragedConflictResolution('weighted average');
      }).toThrow(BadRequestException);
    });

    it('blocks unauthorized personal monitoring', () => {
      expect(() => {
        boundary.assertMonitoringPrivacyAuthorized({ subjectType: 'PERSON' });
      }).toThrow(ForbiddenException);
    });

    it('blocks AI self-verification of alerts', () => {
      expect(() => {
        boundary.assertAiCannotSelfVerify({
          actorRoleMarker: AI_ACTOR_ROLE_MARKER,
          verifierIdentityId: `${AI_ACTOR_IDENTITY_PREFIX}system`,
          isAlgorithmic: true,
        });
      }).toThrow(ForbiddenException);
    });

    it('blocks AI imposing enforcement', () => {
      expect(() => {
        boundary.assertAiCannotImposeEnforcement(AI_ACTOR_ROLE_MARKER);
      }).toThrow(ForbiddenException);
    });

    it('requires approved monitoring source', () => {
      expect(() => {
        boundary.assertMonitoringSourceApproved({
          observationSourceReference: 'unapproved-source',
          approvedSourceReference: 'approved-source',
        });
      }).toThrow(BadRequestException);
    });
  });

  describe('AnalysisService', () => {
    const prisma = {
      analysisRequest: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'req-1' }),
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'req-1',
          question: 'What are the evidence gaps?',
        }),
      },
      analysisRun: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'run-1', requestId: 'req-1' }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      analysisFinding: { create: jest.fn() },
      analysisSource: { create: jest.fn() },
    };

    const service = new AnalysisService(prisma as unknown as PrismaService, boundary);

    it('rejects decision-like findings', async () => {
      await expect(
        service.recordFinding({
          runId: 'run-1',
          findingText: 'Government determination: approve',
          conclusionScope: 'decision',
          isDecisionLike: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects averaged conflict resolution on run start', async () => {
      await expect(
        service.startRun({
          requestId: 'req-1',
          method: 'comparison',
          assumptions: [],
          limitations: 'test',
          conflictResolutionMethod: 'average conflicting values',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('IntelligenceMonitoringService', () => {
    const prisma = {
      intelligenceMonitoringRule: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      intelligenceMonitoringObservation: { create: jest.fn() },
      intelligenceMonitoringAlert: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      intelligenceAlertVerification: { create: jest.fn(), count: jest.fn() },
      intelligenceAlertDisposition: { create: jest.fn() },
    };

    const service = new IntelligenceMonitoringService(prisma as unknown as PrismaService, boundary);

    it('rejects AI verifying alerts', async () => {
      await expect(
        service.verifyAlert({
          alertId: 'alert-1',
          verifierIdentityId: `${AI_ACTOR_IDENTITY_PREFIX}bot`,
          evidenceRefs: [],
          verificationNotes: 'auto verified',
          actorRoleMarker: AI_ACTOR_ROLE_MARKER,
          isAlgorithmic: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects unapproved observation source', async () => {
      prisma.intelligenceMonitoringRule.findUnique.mockResolvedValue({
        id: 'rule-1',
        status: 'ACTIVE',
        approvedSourceReference: 'approved-feed',
        objectType: 'GOVERNMENT_SERVICE',
        objectReference: 'svc-1',
      });

      await expect(
        service.recordObservation({
          ruleId: 'rule-1',
          observedCondition: 'threshold exceeded',
          sourceReference: 'rogue-feed',
          sourceStatus: 'APPROVED',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RiskAssessmentService', () => {
    const prisma = {
      riskDefinition: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'def-1', status: 'ACTIVE' }),
      },
      riskAssessment: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      riskFactor: { create: jest.fn() },
      riskReview: { create: jest.fn() },
    };

    const service = new RiskAssessmentService(prisma as unknown as PrismaService, boundary);

    it('rejects risk assessment claiming authority', async () => {
      await expect(
        service.createAssessment({
          definitionId: 'def-1',
          subjectType: 'CASE',
          subjectReference: 'case-1',
          methodologyVersion: 'v1',
          limitations: 'test',
          claimsAuthority: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unlabeled model estimate factors', async () => {
      await expect(
        service.addFactor({
          assessmentId: 'assess-1',
          factorLabel: 'model output',
          basis: RiskEvidenceBasis.MODEL_ESTIMATE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
