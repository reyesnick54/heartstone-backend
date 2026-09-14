import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ComplianceReviewStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { ComplianceReviewService } from './reviews/compliance-review.service';
import { ComplianceSubmissionService } from './submissions/compliance-submission.service';

describe('Phase 9B must-fail gates', () => {
  describe('ComplianceBoundaryService', () => {
    let boundary: ComplianceBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ComplianceBoundaryService],
      }).compile();
      boundary = module.get(ComplianceBoundaryService);
    });

    it('rejects holder self-setting submission status', () => {
      expect(() => {
        boundary.rejectForbiddenSubmissionFields({ status: 'VERIFIED_COMPLIANT' });
      }).toThrow(BadRequestException);
    });

    it('rejects deadline extension without authority reference', () => {
      expect(() => {
        boundary.assertExtensionRequiresAuthority(new Date(), undefined);
      }).toThrow(BadRequestException);
    });

    it('rejects AI finalizing review', () => {
      expect(() => {
        boundary.assertAiCannotFinalize('FINALIZE_REVIEW', true);
      }).toThrow(ForbiddenException);
    });

    it('requires officeholder for consequential review outcomes', () => {
      expect(() => {
        boundary.assertAuthorizedReviewerPresent(undefined, 'SATISFACTORY_FOR_STATED_PURPOSE');
      }).toThrow(BadRequestException);
    });
  });

  describe('ComplianceSubmissionService', () => {
    const prisma = {
      continuingObligation: { findUnique: jest.fn(), update: jest.fn() },
      complianceSubmission: {
        count: jest.fn().mockResolvedValue(0),
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

    it('does not auto-create sanction on late filing', async () => {
      prisma.continuingObligation.findUnique.mockResolvedValue({
        id: 'obl-1',
        dueDate: new Date('2020-01-01'),
        effectiveExtendedDueDate: null,
        status: 'DUE',
      });
      prisma.complianceSubmission.create.mockResolvedValue({
        id: 'sub-1',
        versions: [{ id: 'v1' }],
      });
      prisma.complianceSubmission.update.mockResolvedValue({});
      prisma.continuingObligation.update.mockResolvedValue({});
      prisma.complianceSubmission.findUnique.mockResolvedValue({ id: 'sub-1' });

      const result = await service.receiveSubmission('identity-1', {
        complianceMatterId: 'matter-1',
        continuingObligationId: 'obl-1',
        reportingPeriodStart: '2025-01-01',
        reportingPeriodEnd: '2025-03-31',
        answersData: { field: 'value' },
      });

      expect(result.isLate).toBe(true);
      expect(result.sanctionAutoCreated).toBe(false);
    });
  });

  describe('ComplianceReviewService', () => {
    const prisma = {
      complianceReview: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      complianceSubmission: { findUnique: jest.fn(), update: jest.fn() },
      complianceSubmissionVersion: { findUnique: jest.fn() },
      obligationEvidenceLink: { findMany: jest.fn().mockResolvedValue([]) },
    };

    let service: ComplianceReviewService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ComplianceReviewService,
          ComplianceBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(ComplianceReviewService);
      jest.clearAllMocks();
    });

    it('blocks AI from finalizing substantive compliance review', async () => {
      prisma.complianceReview.findUnique.mockResolvedValue({
        id: 'rev-1',
        reviewerIdentityId: 'identity-1',
        continuingObligationId: 'obl-1',
        findings: [],
      });

      await expect(
        service.finalizeReview(
          'identity-1',
          {
            reviewId: 'rev-1',
            status: ComplianceReviewStatus.SATISFACTORY_FOR_STATED_PURPOSE,
            reviewerOfficeholderId: 'officeholder-1',
          },
          { isAiActor: true },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
