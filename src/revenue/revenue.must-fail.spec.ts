import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdentityType, TaxAccessActorKind, TaxCalculationSourceKind } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { TaxAssessmentService } from './assessments/tax-assessment.service';
import { TaxAuditMatterService } from './audit/tax-audit-matter.service';
import { ConfigurableTaxCalculationEngine } from './calculation/configurable-tax-calculation.engine';
import { TaxCalculationService } from './calculation/tax-calculation.service';
import { TaxClearanceService } from './clearance/tax-clearance.service';
import { RevenueAccessService } from './common/revenue-access.service';
import { RevenueBoundaryService } from './common/revenue-boundary.service';
import { TaxPaymentAllocationService } from './payments/tax-payment-allocation.service';
import { TaxRefundService } from './refunds/tax-refund.service';
import { TaxReturnService } from './returns/tax-return.service';
import { PLATFORM_ADMIN_TAX_ROLE_MARKER } from './revenue.constants';

describe('Revenue must-fail gates', () => {
  describe('RevenueBoundaryService', () => {
    let boundary: RevenueBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [RevenueBoundaryService],
      }).compile();
      boundary = module.get(RevenueBoundaryService);
    });

    it('blocks AI from issuing tax assessment', () => {
      expect(() => {
        boundary.assertAiCannotIssueAssessment(
          IdentityType.SERVICE,
          TaxCalculationSourceKind.CONFIG_ENGINE,
        );
      }).toThrow(ForbiddenException);
    });

    it('blocks platform admin liability mutation', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotAlterLiability(PLATFORM_ADMIN_TAX_ROLE_MARKER);
      }).toThrow(ForbiddenException);
    });

    it('blocks payment side-effect implying clearance', () => {
      expect(() => {
        boundary.assertPaymentDoesNotGrantClearance('payment recorded; clearance granted');
      }).toThrow(BadRequestException);
    });

    it('requires authoritative clearance conditions', () => {
      expect(() => {
        boundary.assertClearanceAuthoritativeConditions({ filingCurrent: true });
      }).toThrow(BadRequestException);
    });

    it('requires calculation rule version', () => {
      expect(() => {
        boundary.assertCalculationRecordsRuleVersion(undefined);
      }).toThrow(BadRequestException);
    });

    it('blocks destructive edit of locked return version', () => {
      expect(() => {
        boundary.assertSubmittedReturnVersionImmutable(new Date());
      }).toThrow(ForbiddenException);
    });

    it('blocks audit notes that claim violation proven', () => {
      expect(() => {
        boundary.assertAuditMatterDoesNotProveViolation('violation proven by audit matter');
      }).toThrow(BadRequestException);
    });
  });

  describe('RevenueAccessService', () => {
    const prisma = {
      taxpayerAccount: { findUnique: jest.fn() },
      representativeAuthority: { findUnique: jest.fn() },
      taxAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: RevenueAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [RevenueAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      access = module.get(RevenueAccessService);
      jest.clearAllMocks();
    });

    it('denies taxpayer access to another taxpayer account', async () => {
      prisma.taxpayerAccount.findUnique.mockResolvedValue({
        id: 'acct-2',
        primaryIdentityId: 'owner-2',
        organizationId: null,
      });

      await expect(
        access.assertTaxpayerAccountAccess({
          accessorIdentityId: 'owner-1',
          taxpayerAccountId: 'acct-2',
          actorKind: TaxAccessActorKind.TAXPAYER,
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires active representative authority', async () => {
      prisma.taxpayerAccount.findUnique.mockResolvedValue({
        id: 'acct-1',
        primaryIdentityId: 'owner-1',
        organizationId: 'org-1',
      });
      prisma.representativeAuthority.findUnique.mockResolvedValue({
        status: 'PENDING',
        identityId: 'rep-1',
        organizationId: 'org-1',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      });

      await expect(
        access.assertTaxpayerAccountAccess({
          accessorIdentityId: 'rep-1',
          taxpayerAccountId: 'acct-1',
          actorKind: TaxAccessActorKind.REPRESENTATIVE,
          endpoint: 'test',
          representativeAuthorityId: 'auth-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('TaxReturnService', () => {
    const prisma = {
      taxReturn: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      taxReturnVersion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    let service: TaxReturnService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxReturnService,
          RevenueBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxReturnService);
      jest.clearAllMocks();
    });

    it('creates a new version for amendment instead of mutating prior version', async () => {
      prisma.taxReturn.findUnique.mockResolvedValue({
        id: 'ret-1',
        versions: [{ versionNumber: 1 }],
      });
      prisma.taxReturnVersion.create.mockResolvedValue({
        id: 'v2',
        versionNumber: 2,
        isAmendment: true,
      });
      prisma.taxReturn.update.mockResolvedValue({});

      await service.amendReturn({
        taxReturnId: 'ret-1',
        declarationData: { amended: true },
        submittedByIdentityId: 'identity-1',
      });

      expect(prisma.taxReturnVersion.create).toHaveBeenCalledTimes(1);
    });

    it('rejects destructive edit of submitted return version', async () => {
      prisma.taxReturnVersion.findUnique.mockResolvedValue({
        id: 'v1',
        lockedAt: new Date(),
      });

      await expect(service.attemptDestructiveEdit('v1', { tampered: true })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('TaxPaymentAllocationService', () => {
    const prisma = {
      taxLiability: { findUnique: jest.fn(), update: jest.fn() },
      paymentTransaction: { findUnique: jest.fn() },
      taxPaymentAllocation: { create: jest.fn() },
      taxComplianceStatus: { create: jest.fn() },
    };

    let service: TaxPaymentAllocationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxPaymentAllocationService,
          RevenueBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxPaymentAllocationService);
      jest.clearAllMocks();
    });

    it('does not grant clearance when recording payment allocation', async () => {
      prisma.taxLiability.findUnique.mockResolvedValue({
        id: 'liab-1',
        taxpayerAccountId: 'acct-1',
        principalCents: 1000,
      });
      prisma.paymentTransaction.findUnique.mockResolvedValue({ id: 'pay-1' });
      prisma.taxPaymentAllocation.create.mockResolvedValue({ id: 'alloc-1' });
      prisma.taxLiability.update.mockResolvedValue({});
      prisma.taxComplianceStatus.create.mockResolvedValue({});

      const result = await service.recordAllocation({
        taxLiabilityId: 'liab-1',
        paymentTransactionId: 'pay-1',
        allocatedAmountCents: 500,
      });

      expect(result.clearanceGranted).toBe(false);
      expect(prisma.taxComplianceStatus.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('TaxRefundService', () => {
    const prisma = {
      taxRefundClaim: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      taxRefundDecision: { create: jest.fn() },
    };

    let service: TaxRefundService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxRefundService,
          RevenueBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxRefundService);
      jest.clearAllMocks();
    });

    it('refund request does not issue disbursement', async () => {
      prisma.taxRefundClaim.create.mockResolvedValue({ id: 'claim-1', status: 'REQUESTED' });

      const result = await service.requestRefund({
        taxpayerAccountId: 'acct-1',
        requestedByIdentityId: 'identity-1',
        requestedAmountCents: 100,
      });

      expect(result.disbursementIssued).toBe(false);
    });
  });

  describe('TaxAssessmentService', () => {
    const prisma = {
      taxCalculationRecord: { findUnique: jest.fn() },
      taxAssessment: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      taxLiability: { create: jest.fn() },
    };

    let service: TaxAssessmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxAssessmentService,
          RevenueBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxAssessmentService);
      jest.clearAllMocks();
    });

    it('rejects client-forged assessment status', async () => {
      await expect(
        service.issueAssessment({
          taxpayerAccountId: 'acct-1',
          taxTypeDefinitionId: 'type-1',
          taxPeriodId: 'period-1',
          calculationRecordId: 'calc-1',
          issuedByOfficeholderId: 'oh-1',
          actorIdentityType: IdentityType.INDIVIDUAL,
          lines: [{ lineCode: 'A', description: 'line', amountCents: 100 }],
          clientPayload: { status: 'ISSUED' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks platform admin from creating liability via assessment path', async () => {
      await expect(
        service.issueAssessment({
          taxpayerAccountId: 'acct-1',
          taxTypeDefinitionId: 'type-1',
          taxPeriodId: 'period-1',
          calculationRecordId: 'calc-1',
          issuedByOfficeholderId: 'oh-1',
          actorIdentityType: IdentityType.INDIVIDUAL,
          lines: [{ lineCode: 'A', description: 'line', amountCents: 100 }],
          actorRoleMarker: PLATFORM_ADMIN_TAX_ROLE_MARKER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('TaxCalculationService', () => {
    const prisma = {
      taxTypeDefinitionVersion: { findUnique: jest.fn().mockResolvedValue({ id: 'ver-1' }) },
      taxCalculationRecord: { create: jest.fn().mockResolvedValue({ id: 'rec-1' }) },
    };

    let service: TaxCalculationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxCalculationService,
          RevenueBoundaryService,
          ConfigurableTaxCalculationEngine,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxCalculationService);
      jest.clearAllMocks();
    });

    it('records rule configuration version on calculation', async () => {
      await service.recordDeterministicCalculation({
        jurisdictionId: 'jur-1',
        taxPeriodId: 'period-1',
        taxTypeDefinitionVersionId: 'ver-1',
        ruleConfigurationVersion: 3,
        methodologyReference: 'jurisdiction-config://rules/v3',
        inputs: { declaredTotalCents: 2500, currency: 'XCD' },
        calculatedByActorKind: TaxCalculationSourceKind.CONFIG_ENGINE,
      });

      expect(prisma.taxCalculationRecord.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('TaxClearanceService', () => {
    const prisma = {
      taxClearanceCertificateRequest: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    let service: TaxClearanceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxClearanceService,
          RevenueBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxClearanceService);
      jest.clearAllMocks();
    });

    it('requires configured authoritative conditions before issuance', async () => {
      prisma.taxClearanceCertificateRequest.findUnique.mockResolvedValue({ id: 'req-1' });

      await expect(
        service.issueClearanceWhenConfigured({
          requestId: 'req-1',
          authoritativeConditionsMet: {
            filingCurrent: true,
            noOutstandingBalance: true,
            noOpenAuditBlock: true,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('TaxAuditMatterService', () => {
    const prisma = {
      taxAuditMatter: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };

    let service: TaxAuditMatterService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TaxAuditMatterService,
          RevenueBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TaxAuditMatterService);
    });

    it('audit matter does not itself prove violation', async () => {
      const result = await service.openMatter({
        taxpayerAccountId: 'acct-1',
        matterReference: 'AUD-1',
        riskScore: 80,
        notes: 'risk review opened',
      });

      expect(result.violationProven).toBe(false);
    });
  });
});
