import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CustomsActorPersona,
  CustomsClassificationReferenceKind,
  CustomsDeclarationType,
  CustomsDeclarationVersionStatus,
  CustomsPermitReferenceStatus,
  CustomsValuationKind,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CustomsTradeAccessService } from './access/customs-trade-access.service';
import { CustomsAssessmentService } from './assessments/customs-assessment.service';
import { CustomsTradeBoundaryService } from './common/customs-trade-boundary.service';
import { PLATFORM_ADMIN_CUSTOMS_ROLE_MARKER } from './customs-trade.constants';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { CustomsHoldService } from './holds/customs-hold.service';
import { CustomsReleaseService } from './release/customs-release.service';

describe('Customs trade must-fail gates', () => {
  describe('CustomsTradeBoundaryService', () => {
    let boundary: CustomsTradeBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CustomsTradeBoundaryService],
      }).compile();
      boundary = module.get(CustomsTradeBoundaryService);
    });

    it('declaration submission does not release cargo', () => {
      expect(() => {
        boundary.assertDeclarationSubmissionDoesNotReleaseCargo(false);
      }).toThrow(BadRequestException);
    });

    it('payment does not itself release cargo', () => {
      expect(() => {
        boundary.assertPaymentDoesNotReleaseCargo(CustomsActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });

    it('client cannot forge customs assessment', () => {
      expect(() => {
        boundary.rejectClientForgedAssessmentFields({ status: 'ISSUED' });
      }).toThrow(ForbiddenException);
    });

    it('declared value and assessed value remain distinct', () => {
      expect(() => {
        boundary.assertDeclaredAndAssessedValuesDistinct(
          { valuationKind: CustomsValuationKind.ASSESSED },
          { valuationKind: CustomsValuationKind.ASSESSED },
        );
      }).toThrow(BadRequestException);
    });

    it('risk score does not become violation', () => {
      expect(() => {
        boundary.assertRiskScoreIsNotViolation(true, true);
      }).toThrow(BadRequestException);
    });

    it('AI cannot authorize release', () => {
      expect(() => {
        boundary.assertAiCannotAuthorizeRelease(
          'AUTHORIZE_RELEASE',
          CustomsActorPersona.AI_ASSISTANCE,
        );
      }).toThrow(ForbiddenException);
    });

    it('unresolved mandatory permit blocks release', () => {
      expect(() => {
        boundary.assertMandatoryPermitsResolved([
          {
            isMandatoryForRelease: true,
            blocksReleaseWhenUnresolved: true,
            status: CustomsPermitReferenceStatus.UNRESOLVED_MANDATORY,
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('hold cannot be removed by ordinary client update', () => {
      expect(() => {
        boundary.rejectClientForgedHoldRemovalFields({ status: 'REMOVED' });
      }).toThrow(ForbiddenException);
    });

    it('technical admin cannot release shipment', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotReleaseShipment(CustomsActorPersona.TECHNICAL_ADMIN);
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertTechnicalAdminCannotReleaseShipment(
          CustomsActorPersona.CUSTOMS_OFFICER,
          PLATFORM_ADMIN_CUSTOMS_ROLE_MARKER,
        );
      }).toThrow(ForbiddenException);
    });

    it('cross-company shipment access denied', () => {
      expect(() => {
        boundary.assertCrossCompanyAccessBlocked('org-a', 'org-b');
      }).toThrow(ForbiddenException);
    });

    it('AI classification suggestion is not authoritative', () => {
      expect(() => {
        boundary.assertAiClassificationNotAuthoritative(
          CustomsClassificationReferenceKind.AI_SUGGESTION,
          true,
        );
      }).toThrow(ForbiddenException);
    });
  });

  describe('CustomsTradeAccessService', () => {
    const prisma = {
      traderAccount: { findUnique: jest.fn() },
      customsBrokerAuthorization: { findFirst: jest.fn() },
      shipmentReference: { findUnique: jest.fn() },
    };

    let access: CustomsTradeAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsTradeAccessService,
          CustomsTradeBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(CustomsTradeAccessService);
      jest.clearAllMocks();
    });

    it('broker requires active representation', async () => {
      prisma.traderAccount.findUnique.mockResolvedValue({
        id: 'ta-1',
        organizationId: 'org-1',
      });
      prisma.customsBrokerAuthorization.findFirst.mockResolvedValue({
        representativeAuthority: {
          status: RepresentativeAuthorityStatus.PENDING,
          identityId: 'broker-1',
          organizationId: 'org-1',
          effectiveFrom: new Date('2020-01-01'),
          effectiveUntil: null,
        },
      });

      await expect(
        access.assertBrokerHasActiveRepresentation({
          accessorIdentityId: 'broker-1',
          traderAccountId: 'ta-1',
          representativeAuthorityId: 'ra-1',
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cross-company shipment access denied', async () => {
      prisma.shipmentReference.findUnique.mockResolvedValue({
        ownerOrganizationId: 'org-owner',
      });

      await expect(access.assertShipmentOrganizationAccess('org-other', 'ship-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('CustomsDeclarationService', () => {
    const tx = {
      customsDeclaration: {
        create: jest.fn(),
        update: jest.fn(),
      },
      customsDeclarationVersion: {
        create: jest.fn(),
        update: jest.fn(),
      },
      customsStatusHistory: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      customsDeclaration: { findUnique: jest.fn() },
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

    it('declaration submission does not release cargo', async () => {
      tx.customsDeclaration.create.mockResolvedValue({
        id: 'dec-1',
        doesNotReleaseCargo: true,
      });
      tx.customsDeclarationVersion.create.mockResolvedValue({ id: 'ver-1', versionNumber: 1 });
      tx.customsDeclaration.update.mockResolvedValue({});
      tx.customsStatusHistory.create.mockResolvedValue({});

      const result = await service.submitDeclaration({
        traderAccountId: 'ta-1',
        declarationType: CustomsDeclarationType.IMPORT,
      });

      expect(result.cargoReleased).toBe(false);
      expect(result.declaration.doesNotReleaseCargo).toBe(true);
    });

    it('declaration amendments preserve prior version', async () => {
      prisma.customsDeclaration.findUnique.mockResolvedValue({
        id: 'dec-1',
        currentVersion: { id: 'ver-1', versionNumber: 1 },
      });
      tx.customsDeclarationVersion.update.mockResolvedValue({});
      tx.customsDeclarationVersion.create.mockResolvedValue({ id: 'ver-2', versionNumber: 2 });
      tx.customsDeclaration.update.mockResolvedValue({});

      const result = await service.amendDeclaration({ customsDeclarationId: 'dec-1' });

      expect(result.priorVersionPreserved).toBe(true);
      expect(result.priorVersionId).toBe('ver-1');
      expect(result.newVersion.versionNumber).toBe(2);
      expect(tx.customsDeclarationVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ver-1' },
          data: { status: CustomsDeclarationVersionStatus.SUPERSEDED },
        }),
      );
    });
  });

  describe('CustomsReleaseService', () => {
    let release: CustomsReleaseService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsReleaseService,
          CustomsTradeBoundaryService,
          {
            provide: PrismaService,
            useValue: {
              customsHold: { count: jest.fn().mockResolvedValue(0) },
              customsDeclaration: { findFirst: jest.fn().mockResolvedValue(null) },
              customsReleaseRecord: { create: jest.fn() },
              shipmentReference: { update: jest.fn() },
            },
          },
        ],
      }).compile();
      release = module.get(CustomsReleaseService);
    });

    it('payment does not itself release cargo', () => {
      expect(() => {
        release.assertPaymentEventDoesNotRelease(CustomsActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });
  });

  describe('CustomsAssessmentService', () => {
    let assessment: CustomsAssessmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsAssessmentService,
          CustomsTradeBoundaryService,
          { provide: PrismaService, useValue: {} },
        ],
      }).compile();
      assessment = module.get(CustomsAssessmentService);
    });

    it('client cannot forge customs assessment', () => {
      expect(() => {
        assessment.rejectClientForgedAssessment({ assessmentReference: 'forged' });
      }).toThrow(ForbiddenException);
    });
  });

  describe('CustomsHoldService', () => {
    let holds: CustomsHoldService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CustomsHoldService,
          CustomsTradeBoundaryService,
          {
            provide: PrismaService,
            useValue: { customsHold: { create: jest.fn(), update: jest.fn() } },
          },
        ],
      }).compile();
      holds = module.get(CustomsHoldService);
    });

    it('hold cannot be removed by ordinary client update', () => {
      expect(() => {
        holds.rejectOrdinaryClientHoldUpdate({ removedAt: new Date().toISOString() });
      }).toThrow(ForbiddenException);
    });
  });
});
