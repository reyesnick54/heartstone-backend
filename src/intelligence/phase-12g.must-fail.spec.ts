import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  InstitutionalMetricClaimStatus,
  ReportApprovalStatus,
  ReportClaimStatus,
  ReportClassification,
  ReportPublicationStatus,
  ReportType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { AI_ACTOR_IDENTITY_PREFIX } from '../evidence/evidence.constants';
import { ReportingBoundaryService } from './common/reporting-boundary.service';
import { hashReportContent } from './common/reporting-hash.util';
import { EvidenceDashboardTraceService } from './reporting/evidence-dashboard-trace.service';
import { ReportCorrectionService } from './reporting/report-correction.service';
import { ReportGenerationService } from './reporting/report-generation.service';
import { ReportPublicationService } from './reporting/report-publication.service';

describe('Phase 12G must-fail gates', () => {
  describe('ReportingBoundaryService', () => {
    let boundary: ReportingBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ReportingBoundaryService],
      }).compile();
      boundary = module.get(ReportingBoundaryService);
    });

    it('rejects client setting protected publication fields', () => {
      expect(() => {
        boundary.rejectClientProtectedFields({ publishedAt: new Date().toISOString() });
      }).toThrow(BadRequestException);
    });

    it('blocks AI from approving publication', () => {
      expect(() => {
        boundary.assertAiCannotApprovePublication(`${AI_ACTOR_IDENTITY_PREFIX}test`);
      }).toThrow(ForbiddenException);
    });

    it('blocks public report converting association to causation', () => {
      expect(() => {
        boundary.assertPublicReportCannotDeclareCausation(ReportType.PUBLIC, true, false);
      }).toThrow(BadRequestException);
    });

    it('blocks ABSEZ metric represented as Government statistic without confirmation', () => {
      expect(() => {
        boundary.assertGovernmentStatisticConfirmationRequired(true, false, 'ABSEZ');
      }).toThrow(BadRequestException);
    });

    it('blocks suppression of adverse findings', () => {
      expect(() => {
        boundary.assertAdverseFindingsNotSuppressed(['ADVERSE', 'POSITIVE'], ['POSITIVE']);
      }).toThrow(BadRequestException);
    });

    it('redacts protected case details for public reports', () => {
      const redacted = boundary.redactRestrictedContent(
        { applicantNationalId: '12345', summary: 'ok' },
        ReportClassification.PUBLIC,
      );
      expect(redacted.applicantNationalId).toBe('[REDACTED]');
      expect(redacted.summary).toBe('ok');
    });

    it('blocks public report revealing protected case details', () => {
      expect(() => {
        boundary.assertPublicReportDoesNotRevealProtectedDetails(ReportClassification.PUBLIC, {
          protectedPartyName: 'Jane Doe',
        });
      }).toThrow(BadRequestException);
    });
  });

  describe('ReportPublicationService', () => {
    let publicationService: ReportPublicationService;
    let prisma: {
      reportGenerationRun: { findUnique: jest.Mock };
      authorityEvaluationRecord: { findUnique: jest.Mock };
      reportPublication: { create: jest.Mock };
      $transaction: jest.Mock;
    };

    const baseRun = {
      id: 'run-1',
      dataCutoffAt: new Date('2026-01-01'),
      frozenContent: { requiredOutcomeClassifications: ['ADVERSE'] },
      reportDefinitionVersion: {
        reportDefinition: {
          reportType: ReportType.INTERNAL_OPERATIONAL,
          requiresPrivacyReview: false,
          requiresSecurityReview: false,
          requiresRecordsReview: false,
        },
      },
      claimPins: [],
      metricPins: [],
      sections: [],
      reviews: [],
      approvals: [{ status: ReportApprovalStatus.APPROVED, isAiActor: false }],
      publications: [],
    };

    beforeEach(async () => {
      prisma = {
        reportGenerationRun: { findUnique: jest.fn().mockResolvedValue(baseRun) },
        authorityEvaluationRecord: {
          findUnique: jest.fn().mockResolvedValue({ outcome: AuthorityEvaluationOutcome.ALLOW }),
        },
        reportPublication: { create: jest.fn() },
        $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
      };

      const module = await Test.createTestingModule({
        providers: [
          ReportPublicationService,
          ReportingBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      publicationService = module.get(ReportPublicationService);
    });

    it('cannot publish unsupported metric', async () => {
      prisma.reportGenerationRun.findUnique.mockResolvedValue({
        ...baseRun,
        metricPins: [{ metricCalculationRun: { status: 'FAILED' } }],
        sections: [
          {
            status: ReportClaimStatus.APPROVED,
            isOfficialClaim: true,
            outcomeClassification: 'POSITIVE',
            causationDeclared: false,
            representsGovernmentStatistic: false,
            governmentStatisticConfirmed: false,
            institutionalMetricClaim: {
              associationOnly: true,
              status: InstitutionalMetricClaimStatus.APPROVED,
              validUntil: null,
              revalidationState: 'CURRENT',
            },
          },
        ],
      });

      await expect(
        publicationService.publish({
          reportGenerationRunId: 'run-1',
          publisherIdentityId: 'human-1',
          authorityEvaluationRecordId: 'auth-1',
          classification: ReportClassification.INTERNAL,
        }),
      ).rejects.toThrow('unsupported');
    });

    it('cannot publish expired claim as current', async () => {
      prisma.reportGenerationRun.findUnique.mockResolvedValue({
        ...baseRun,
        sections: [
          {
            status: ReportClaimStatus.APPROVED,
            isOfficialClaim: true,
            outcomeClassification: 'POSITIVE',
            causationDeclared: false,
            representsGovernmentStatistic: false,
            governmentStatisticConfirmed: false,
            institutionalMetricClaim: {
              associationOnly: true,
              status: InstitutionalMetricClaimStatus.EXPIRED,
              validUntil: new Date('2025-01-01'),
              revalidationState: 'CURRENT',
            },
          },
        ],
        metricPins: [{ metricCalculationRun: { status: 'CALCULATED' } }],
      });

      await expect(
        publicationService.publish({
          reportGenerationRunId: 'run-1',
          publisherIdentityId: 'human-1',
          authorityEvaluationRecordId: 'auth-1',
          classification: ReportClassification.INTERNAL,
        }),
      ).rejects.toThrow('expired');
    });

    it('cannot suppress adverse finding', async () => {
      prisma.reportGenerationRun.findUnique.mockResolvedValue({
        ...baseRun,
        frozenContent: { requiredOutcomeClassifications: ['ADVERSE', 'POSITIVE'] },
        sections: [
          {
            status: ReportClaimStatus.APPROVED,
            isOfficialClaim: true,
            outcomeClassification: 'POSITIVE',
            causationDeclared: false,
            representsGovernmentStatistic: false,
            governmentStatisticConfirmed: false,
            institutionalMetricClaim: {
              associationOnly: true,
              status: InstitutionalMetricClaimStatus.APPROVED,
              validUntil: null,
              revalidationState: 'CURRENT',
            },
          },
        ],
        metricPins: [{ metricCalculationRun: { status: 'CALCULATED' } }],
      });

      await expect(
        publicationService.publish({
          reportGenerationRunId: 'run-1',
          publisherIdentityId: 'human-1',
          authorityEvaluationRecordId: 'auth-1',
          classification: ReportClassification.INTERNAL,
        }),
      ).rejects.toThrow('suppress');
    });

    it('AI cannot approve publication', async () => {
      prisma.reportGenerationRun.findUnique.mockResolvedValue({
        ...baseRun,
        approvals: [{ status: ReportApprovalStatus.APPROVED, isAiActor: true }],
        sections: [
          {
            status: ReportClaimStatus.APPROVED,
            isOfficialClaim: true,
            outcomeClassification: 'ADVERSE',
            causationDeclared: false,
            representsGovernmentStatistic: false,
            governmentStatisticConfirmed: false,
            institutionalMetricClaim: {
              associationOnly: true,
              status: InstitutionalMetricClaimStatus.APPROVED,
              validUntil: null,
              revalidationState: 'CURRENT',
            },
          },
        ],
        metricPins: [{ metricCalculationRun: { status: 'CALCULATED' } }],
        frozenContent: { requiredOutcomeClassifications: ['ADVERSE'] },
      });

      await expect(
        publicationService.publish({
          reportGenerationRunId: 'run-1',
          publisherIdentityId: 'human-1',
          authorityEvaluationRecordId: 'auth-1',
          classification: ReportClassification.INTERNAL,
        }),
      ).rejects.toThrow('AI cannot approve');
    });
  });

  describe('ReportCorrectionService', () => {
    it('preserves original content on correction', async () => {
      const original = { metric: 42, note: 'original' };
      const prisma: Record<string, unknown> = {
        reportPublication: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pub-1',
            status: ReportPublicationStatus.PUBLISHED,
            classification: ReportClassification.INTERNAL,
            frozenContent: original,
          }),
          update: jest.fn(),
        },
        reportCorrection: {
          create: jest.fn().mockResolvedValue({
            id: 'corr-1',
            correctedAt: new Date(),
            originalContent: original,
            correctedContent: { metric: 43 },
          }),
        },
        reportCorrectionAffectedClaim: { create: jest.fn() },
      };
      prisma.$transaction = jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn(prisma),
      );

      const module = await Test.createTestingModule({
        providers: [
          ReportCorrectionService,
          ReportingBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const service = module.get(ReportCorrectionService);
      const result = await service.createCorrection({
        reportPublicationId: 'pub-1',
        correctedContent: { metric: 43 },
        reason: 'Corrected calculation',
        correctedByIdentityId: 'human-1',
      });

      expect(result.originalPreserved).toBe(true);
      expect(result.originalContent).toEqual(original);
    });
  });

  describe('ReportGenerationService immutability', () => {
    it('preserves data cutoff and content hash at generation time', async () => {
      const cutoff = new Date('2026-01-15');
      const content = { section: 'summary', value: 10 };
      const hash = hashReportContent(content);

      const prisma: Record<string, unknown> = {
        reportDefinitionVersion: { findUnique: jest.fn().mockResolvedValue({ id: 'ver-1' }) },
        metricCalculationRun: {
          findMany: jest.fn().mockResolvedValue([{ id: 'm-1', status: 'CALCULATED' }]),
        },
        institutionalMetricClaim: { findMany: jest.fn().mockResolvedValue([]) },
        reportGenerationRun: {
          create: jest.fn().mockResolvedValue({
            id: 'run-1',
            runNumber: 'RRUN-1',
            contentHash: hash,
            dataCutoffAt: cutoff,
          }),
        },
        reportGenerationRunMetricPin: { create: jest.fn() },
        reportGenerationRunClaimPin: { create: jest.fn() },
      };
      prisma.$transaction = jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn(prisma),
      );

      const module = await Test.createTestingModule({
        providers: [ReportGenerationService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get(ReportGenerationService);
      const result = await service.createRun({
        reportDefinitionVersionId: 'ver-1',
        initiatedByIdentityId: 'human-1',
        dataCutoffAt: cutoff,
        metricCalculationRunIds: ['m-1'],
        institutionalMetricClaimIds: [],
        frozenContent: content,
      });

      expect(result.contentHash).toBe(hash);
      expect(result.dataCutoffAt).toEqual(cutoff);
    });
  });

  describe('EvidenceDashboardTraceService', () => {
    it('links dashboard number to evidence and calculation version', async () => {
      const prisma = {
        reportingDashboardIndicator: {
          findUnique: jest.fn().mockResolvedValue({
            indicatorCode: 'CASES_CLEARED',
            displayValue: '42',
            countValue: 42,
            drillDownReferences: [{ evidenceRecordId: 'ev-1' }],
          }),
        },
        evidenceDashboardDecisionTrace: {
          create: jest.fn().mockResolvedValue({ id: 'trace-1', traceNumber: 'TRACE-1' }),
        },
      };

      const module = await Test.createTestingModule({
        providers: [EvidenceDashboardTraceService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get(EvidenceDashboardTraceService);
      const trace = await service.linkDashboardToEvidence('ind-1', 'ev-1', 'calc-1', 'claim-1');

      expect(trace.id).toBe('trace-1');
      expect(prisma.evidenceDashboardDecisionTrace.create).toHaveBeenCalled();
    });

    it('builds claim trace linking to calculation version', async () => {
      const prisma = {
        reportClaim: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'rc-1',
            institutionalMetricClaimId: 'pc-1',
            institutionalMetricClaim: {
              metricCalculationRun: {
                id: 'calc-1',
                methodologyVersion: 'v2.1',
                dataCutoffAt: new Date('2026-01-01'),
              },
            },
            reportGenerationRun: {
              dashboardPins: [
                {
                  reportingDashboardIndicator: {
                    id: 'ind-1',
                    displayValue: '42',
                    countValue: 42,
                    drillDownReferences: [],
                  },
                },
              ],
            },
            decisionTraces: [],
          }),
        },
      };

      const module = await Test.createTestingModule({
        providers: [EvidenceDashboardTraceService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get(EvidenceDashboardTraceService);
      const chain = await service.buildFullTraceChain('rc-1');

      expect(chain?.metricCalculationRunId).toBe('calc-1');
      expect(chain?.methodologyVersion).toBe('v2.1');
      expect(chain?.reportingDashboardIndicatorId).toBe('ind-1');
    });
  });
});
