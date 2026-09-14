import { Test } from '@nestjs/testing';
import { ComplianceSubmissionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceBoundaryService } from '../common/compliance-boundary.service';
import { ComplianceSubmissionService } from './compliance-submission.service';

describe('ComplianceSubmissionService', () => {
  const prisma = {
    continuingObligation: { findUnique: jest.fn(), update: jest.fn() },
    complianceSubmission: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    complianceSubmissionVersion: { create: jest.fn(), findUnique: jest.fn() },
    obligationEvidenceLink: { create: jest.fn() },
  };

  let service: ComplianceSubmissionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ComplianceSubmissionService,
        ComplianceBoundaryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ComplianceSubmissionService);
    jest.clearAllMocks();
  });

  it('records receipt without implying verification', async () => {
    prisma.continuingObligation.findUnique.mockResolvedValue({
      id: 'obl-1',
      dueDate: new Date('2099-01-01'),
      effectiveExtendedDueDate: null,
      status: 'DUE',
    });
    prisma.complianceSubmission.count.mockResolvedValue(0);
    prisma.complianceSubmission.create.mockResolvedValue({
      id: 'sub-1',
      versions: [{ id: 'v1', version: 1 }],
    });
    prisma.complianceSubmission.update.mockResolvedValue({});
    prisma.continuingObligation.update.mockResolvedValue({});
    prisma.complianceSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: ComplianceSubmissionStatus.COMPLETE_FOR_REVIEW,
    });

    const result = await service.receiveSubmission('identity-1', {
      complianceMatterId: 'matter-1',
      continuingObligationId: 'obl-1',
      reportingPeriodStart: '2025-01-01',
      reportingPeriodEnd: '2025-03-31',
      answersData: { report: 'submitted' },
    });

    expect(result.receiptDisclaimer).toContain('receipt');
    const [[createArgs]] = prisma.complianceSubmission.create.mock.calls as [
      [{ data: { status: ComplianceSubmissionStatus } }],
    ];
    expect(createArgs.data.status).toBe(ComplianceSubmissionStatus.RECEIVED);
  });

  it('preserves original version when correction is filed', async () => {
    prisma.complianceSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      versions: [{ id: 'v1', version: 1 }],
    });
    prisma.complianceSubmissionVersion.create.mockResolvedValue({ id: 'v2', version: 2 });
    prisma.complianceSubmission.update.mockResolvedValue({});
    prisma.complianceSubmissionVersion.findUnique.mockResolvedValue({ id: 'v1', version: 1 });

    const result = await service.requestCorrection('reviewer-1', {
      submissionId: 'sub-1',
      correctionReason: 'Corrected figures',
      answersData: { report: 'corrected' },
    });

    expect(result.priorVersionRetained).toBe(true);
    expect(result.preservedOriginalVersion).toEqual({ id: 'v1', version: 1 });
  });
});
