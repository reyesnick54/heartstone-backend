import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  MetricBaselineQualityStatus,
  MetricDependencyTimeClassification,
  PerformanceAttributionClassification,
  PerformanceClaimReviewOutcome,
  PerformanceClaimStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { MeasuredPerformanceClaimService } from './claims/measured-performance-claim.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { MetricDefinitionService } from './metrics/metric-definition.service';

describe('Phase 12A must-fail gates', () => {
  describe('IntelligenceBoundaryService', () => {
    let boundary: IntelligenceBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [IntelligenceBoundaryService],
      }).compile();
      boundary = module.get(IntelligenceBoundaryService);
    });

    it('rejects metric publish without source requirements', () => {
      expect(() => {
        boundary.assertMetricHasSourceRequirements([]);
      }).toThrow(BadRequestException);
    });

    it('rejects metric publish without calculation method', () => {
      expect(() => {
        boundary.assertMetricHasCalculationMethod(undefined);
      }).toThrow(BadRequestException);
    });

    it('requires missing baseline to remain disclosed', () => {
      expect(() => {
        boundary.assertBaselineDisclosedWhenUnavailable(
          true,
          MetricBaselineQualityStatus.BASELINE_UNAVAILABLE,
          '42',
        );
      }).toThrow(BadRequestException);
    });

    it('rejects invented zero baseline', () => {
      expect(() => {
        boundary.assertBaselineDisclosedWhenUnavailable(
          true,
          MetricBaselineQualityStatus.ACCEPTABLE,
          '0',
        );
      }).toThrow(BadRequestException);
    });

    it('rejects silent exclusions', () => {
      expect(() => {
        boundary.assertExclusionsDocumented([{ id: '1' }], []);
      }).toThrow(BadRequestException);
    });

    it('blocks ABSEZ delay relabeling without rule', () => {
      expect(() => {
        boundary.assertDependencyRelabelRequiresRule(
          MetricDependencyTimeClassification.ABSEZ_CONTROLLED_TIME,
          MetricDependencyTimeClassification.EXTERNAL_DEPENDENCY_TIME,
          false,
        );
      }).toThrow(BadRequestException);
    });

    it('blocks external delay attributed to ABSEZ automatically', () => {
      expect(() => {
        boundary.assertExternalDelayNotAttributedToAbsez(
          MetricDependencyTimeClassification.EXTERNAL_DEPENDENCY_TIME,
          true,
        );
      }).toThrow(BadRequestException);
    });

    it('blocks application complete conflated with approved', () => {
      expect(() => {
        boundary.assertNoConflation('APPLICATION_COMPLETE', 'APPROVED');
      }).toThrow(BadRequestException);
    });

    it('blocks forecast employment conflated with jobs created', () => {
      expect(() => {
        boundary.assertNoConflation('FORECAST_EMPLOYMENT', 'JOBS_CREATED');
      }).toThrow(BadRequestException);
    });

    it('blocks proposed investment conflated with committed investment', () => {
      expect(() => {
        boundary.assertNoConflation('PROPOSED_INVESTMENT', 'COMMITTED_INVESTMENT');
      }).toThrow(BadRequestException);
    });

    it('blocks committed investment conflated with deployed capital', () => {
      expect(() => {
        boundary.assertNoConflation('COMMITTED_INVESTMENT', 'DEPLOYED_CAPITAL');
      }).toThrow(BadRequestException);
    });

    it('blocks project announcement conflated with operational project', () => {
      expect(() => {
        boundary.assertNoConflation('PROJECT_ANNOUNCEMENT', 'OPERATIONAL_PROJECT');
      }).toThrow(BadRequestException);
    });

    it('blocks system uptime conflated with institutional service integrity', () => {
      expect(() => {
        boundary.assertNoConflation('SYSTEM_UPTIME', 'INSTITUTIONAL_SERVICE_INTEGRITY');
      }).toThrow(BadRequestException);
    });

    it('blocks correlation conflated with causation', () => {
      expect(() => {
        boundary.assertNoConflation('CORRELATION', 'CAUSATION');
      }).toThrow(BadRequestException);
    });

    it('blocks AI approving official performance claim', () => {
      expect(() => {
        boundary.assertAiCannotApprovePerformanceClaim(
          'AI_ASSISTANCE',
          'approveOfficialPerformanceClaim',
        );
      }).toThrow(ForbiddenException);
    });

    it('defaults attribution to NOT_ESTABLISHED', () => {
      expect(boundary.assertDefaultAttribution()).toBe(
        PerformanceAttributionClassification.NOT_ESTABLISHED,
      );
    });

    it('rejects expired claim remaining current', () => {
      expect(() => {
        boundary.assertExpiredClaimCannotRemainCurrent(
          PerformanceClaimStatus.APPROVED_FOR_PUBLICATION,
          new Date('2020-01-01'),
        );
      }).toThrow(BadRequestException);
    });

    it('requires evidence for publication verification', () => {
      expect(() => {
        boundary.assertClaimRequiresEvidenceForPublication(
          PerformanceClaimStatus.VERIFIED_FOR_STATED_PURPOSE,
          0,
        );
      }).toThrow(BadRequestException);
    });

    it('preserves adverse results on overwrite attempt', () => {
      expect(() => {
        boundary.assertAdverseResultsPreserved(null, '12.5');
      }).toThrow(BadRequestException);
    });
  });

  describe('MetricDefinitionService', () => {
    let service: MetricDefinitionService;
    const prisma: {
      metricDefinition: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
      metricDefinitionVersion: {
        findFirst: jest.Mock;
        create: jest.Mock;
        findUnique: jest.Mock;
        updateMany: jest.Mock;
        update: jest.Mock;
      };
      $transaction: jest.Mock;
    } = {
      metricDefinition: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      metricDefinitionVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    );

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          MetricDefinitionService,
          IntelligenceBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(MetricDefinitionService);
      jest.clearAllMocks();
    });

    it('rejects javascript formula specifications', async () => {
      prisma.metricDefinition.findUnique.mockResolvedValue({ id: 'def-1' });
      prisma.metricDefinitionVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.createVersion('def-1', {
          formulaSpecification: { type: 'javascript', expression: '1+1' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('MeasuredPerformanceClaimService', () => {
    let service: MeasuredPerformanceClaimService;
    const prisma = {
      metricCalculationRun: { findUnique: jest.fn() },
      measuredPerformanceClaim: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      measuredPerformanceClaimReview: { create: jest.fn() },
    };

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          MeasuredPerformanceClaimService,
          IntelligenceBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(MeasuredPerformanceClaimService);
      jest.clearAllMocks();
    });

    it('rejects causal attribution without approved method', async () => {
      prisma.measuredPerformanceClaim.findUnique.mockResolvedValue({
        id: 'claim-1',
        attributionClassification: PerformanceAttributionClassification.NOT_ESTABLISHED,
        effectivePeriodEnd: null,
        evidenceLinks: [{ id: 'link-1' }],
      });

      await expect(
        service.review(
          'claim-1',
          'reviewer-1',
          {
            outcome: PerformanceClaimReviewOutcome.SUPPORTED,
            approved: true,
            attributionClassification:
              PerformanceAttributionClassification.CAUSAL_WITH_APPROVED_METHOD,
            approvedCausalMethod: false,
          },
          'HUMAN_REVIEWER',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
