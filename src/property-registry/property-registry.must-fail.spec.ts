import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  PropertyRegistryAccessClassification,
  PropertyRegistryCorrectionStatus,
  PropertyTransferApplicationStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { PropertyRegistryAuditService } from './audit/property-registry-audit.service';
import { PropertyRegistryClassificationAccessService } from './common/property-registry-access.service';
import { PropertyRegistryBoundaryService } from './common/property-registry-boundary.service';
import { PropertyRegistryCorrectionService } from './corrections/property-registry-correction.service';
import { PropertyEncumbranceService } from './encumbrances/property-encumbrance.service';
import { PropertyTransferIntakeService } from './intake/property-transfer-intake.service';
import { PLATFORM_ADMIN_ROLE_MARKER } from './property-registry.constants';
import { PropertyRegistryReadService } from './queries/property-registry-read.service';
import { PropertyTitleRegistrationService } from './registration/property-title-registration.service';
import { PropertyTransferPaymentService } from './transfers/property-transfer-payment.service';
import { PropertyRegistryVerificationService } from './verification/property-registry-verification.service';

describe('Property registry must-fail gates', () => {
  describe('PropertyRegistryBoundaryService', () => {
    let boundary: PropertyRegistryBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PropertyRegistryBoundaryService],
      }).compile();
      boundary = module.get(PropertyRegistryBoundaryService);
    });

    it('citizen cannot directly change title holder', () => {
      expect(() => {
        boundary.assertCitizenCannotDirectlyChangeTitleHolder({ mutatesTitleHolder: true });
      }).toThrow(ForbiddenException);
    });

    it('transfer application does not itself change ownership', () => {
      expect(() => {
        boundary.assertTransferApplicationDoesNotMutateTitle(
          PropertyTransferApplicationStatus.REGISTERED_OFFICIAL,
        );
      }).toThrow(ForbiddenException);
    });

    it('payment of transfer fee does not change title', () => {
      expect(() => {
        boundary.assertPaymentDoesNotChangeTitle(true);
      }).toThrow(ForbiddenException);
    });

    it('encumbrance cannot be silently deleted', () => {
      expect(() => {
        boundary.assertEncumbranceCannotBeSilentlyDeleted('delete');
      }).toThrow(ForbiddenException);
    });

    it('unauthorized representative cannot transfer property', () => {
      expect(() => {
        boundary.assertUnauthorizedRepresentativeCannotTransfer(false);
      }).toThrow(ForbiddenException);
    });

    it('technical admin cannot mutate legal ownership', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotMutateLegalOwnership({
          actorRoleMarker: PLATFORM_ADMIN_ROLE_MARKER,
          mutatesLegalOwnership: true,
        });
      }).toThrow(ForbiddenException);
    });

    it('AI cannot approve title transfer', () => {
      expect(() => {
        boundary.assertAiCannotApproveTitleTransfer('APPROVE_TRANSFER', true);
      }).toThrow(ForbiddenException);
    });

    it('rejects client-forged title holder fields', () => {
      expect(() => {
        boundary.rejectClientForgedTitleHolderFields({ isCurrent: true });
      }).toThrow(ForbiddenException);
    });
  });

  describe('PropertyRegistryClassificationAccessService', () => {
    let access: PropertyRegistryClassificationAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PropertyRegistryClassificationAccessService],
      }).compile();
      access = module.get(PropertyRegistryClassificationAccessService);
    });

    it('restricted property information not exposed', () => {
      expect(() => {
        access.assertMayReadRegistryPayload({
          actorIdentityId: 'citizen-1',
          accessClassification: PropertyRegistryAccessClassification.SEALED,
        });
      }).toThrow(ForbiddenException);
    });

    it('public verification exposes only permitted registry information', () => {
      const payload = access.assertPublicVerificationOnlyPayload({
        entryReference: 'PRE-1',
        verificationState: 'VERIFIED',
        registeredAt: new Date(),
        titleReference: 'TR-1',
        titlePayload: { secret: true },
      });

      expect(payload).not.toHaveProperty('titlePayload');
      expect(payload).toHaveProperty('entryReference');
    });
  });

  describe('PropertyTransferIntakeService', () => {
    const prisma = {
      propertyTransfer: { create: jest.fn().mockResolvedValue({ id: 'pt-1' }) },
      propertyTransactionHistory: { create: jest.fn() },
      propertyRegistryAuditEvent: { create: jest.fn() },
    };

    let service: PropertyTransferIntakeService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyTransferIntakeService,
          PropertyRegistryBoundaryService,
          PropertyRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(PropertyTransferIntakeService);
      jest.clearAllMocks();
    });

    it('creates intake in INTAKE_DRAFT without mutating title', async () => {
      await service.createIntake('applicant-1', {
        landParcelId: 'lp-1',
        propertyRecordId: 'pr-1',
        jurisdictionId: 'j-1',
        institutionId: 'i-1',
      });

      expect(prisma.propertyTransfer.create).toHaveBeenCalled();
      const [[createArgs]] = prisma.propertyTransfer.create.mock.calls as [
        [{ data: { applicationStatus: PropertyTransferApplicationStatus } }],
      ];
      expect(createArgs.data.applicationStatus).toBe(
        PropertyTransferApplicationStatus.INTAKE_DRAFT,
      );
    });
  });

  describe('PropertyTransferPaymentService', () => {
    const prisma = {
      propertyTransfer: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pt-1',
          titleRecordId: 'tr-1',
        }),
        update: jest.fn().mockResolvedValue({ id: 'pt-1' }),
      },
      propertyTransactionHistory: { create: jest.fn() },
      propertyRegistryAuditEvent: { create: jest.fn() },
    };

    let service: PropertyTransferPaymentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyTransferPaymentService,
          PropertyRegistryBoundaryService,
          PropertyRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(PropertyTransferPaymentService);
      jest.clearAllMocks();
    });

    it('records fee without title mutation flag in history', async () => {
      await service.recordTransferFeePayment({
        propertyTransferId: 'pt-1',
        paymentTransactionId: 'pay-1',
        actorIdentityId: 'payer-1',
      });

      /* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matcher composition */
      expect(prisma.propertyTransactionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventSummary: expect.objectContaining({ mutatesTitle: false }),
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
  });

  describe('PropertyTitleRegistrationService', () => {
    const prisma = {
      authorityEvaluationRecord: { findUnique: jest.fn() },
      propertyTransfer: { findUnique: jest.fn() },
      propertyRegistryAuditEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    let service: PropertyTitleRegistrationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyTitleRegistrationService,
          PropertyRegistryBoundaryService,
          PropertyRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(PropertyTitleRegistrationService);
      jest.clearAllMocks();
      prisma.authorityEvaluationRecord.findUnique.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
      });
    });

    it('blocks AI from recording title registration', async () => {
      prisma.propertyTransfer.findUnique.mockResolvedValue({
        id: 'pt-1',
        titleRecordId: 'tr-1',
        registryEntry: null,
        titleRecord: { id: 'tr-1', currentVersionNumber: 1 },
      });

      await expect(
        service.recordOfficialTitleRegistration('official-1', {
          propertyTransferId: 'pt-1',
          caseId: 'case-1',
          jurisdictionId: 'j-1',
          institutionId: 'i-1',
          governmentDecisionId: 'dec-1',
          authorityEvaluationRecordId: 'auth-1',
          registrarOfficeholderId: 'oh-1',
          registrarIdentityId: 'official-1',
          titlePayloadSnapshot: {},
          isAiActor: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prior title history preserved via supersession transaction path', async () => {
      prisma.propertyTransfer.findUnique.mockResolvedValue({
        id: 'pt-1',
        transferReference: 'PT-1',
        propertyRecordId: 'pr-1',
        titleRecordId: 'tr-1',
        registryEntry: null,
        titleRecord: { id: 'tr-1', currentVersionNumber: 1, registeredAt: new Date() },
      });

      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          titleVersion: {
            findFirst: jest.fn().mockResolvedValue({ id: 'tv-1' }),
            update: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'tv-2' }),
          },
          propertyRegistryEntry: {
            create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
          },
          titleRecord: { update: jest.fn() },
          propertyTransfer: { update: jest.fn() },
          propertyTransactionHistory: { create: jest.fn() },
        }),
      );

      const result = await service.recordOfficialTitleRegistration('official-1', {
        propertyTransferId: 'pt-1',
        caseId: 'case-1',
        jurisdictionId: 'j-1',
        institutionId: 'i-1',
        governmentDecisionId: 'dec-1',
        authorityEvaluationRecordId: 'auth-1',
        registrarOfficeholderId: 'oh-1',
        registrarIdentityId: 'official-1',
        titlePayloadSnapshot: { holder: 'B' },
      });

      expect(result.priorVersion?.id).toBe('tv-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('PropertyRegistryReadService', () => {
    const prisma = {
      propertyRegistryEntry: { findUnique: jest.fn() },
      landParcel: { findUnique: jest.fn() },
      titleRecord: { findUnique: jest.fn() },
    };

    let service: PropertyRegistryReadService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyRegistryReadService,
          PropertyRegistryClassificationAccessService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(PropertyRegistryReadService);
      jest.clearAllMocks();
    });

    it('parcel and title are distinct concepts', async () => {
      prisma.landParcel.findUnique.mockResolvedValue({ id: 'lp-1', parcelReference: 'LP-1' });
      prisma.titleRecord.findUnique.mockResolvedValue({
        id: 'tr-1',
        titleReference: 'TR-1',
        landParcelId: 'lp-1',
        landParcel: { parcelReference: 'LP-1' },
      });

      const result = await service.assertParcelDistinctFromTitle('lp-1', 'tr-1');
      expect(result.distinctConcepts).toBe(true);
      expect(result.parcelReference).not.toBe(result.titleReference);
    });

    it('masks sealed entries as not found for unauthorized readers', async () => {
      prisma.propertyRegistryEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        entryReference: 'PRE-1',
        registeredAt: new Date(),
        accessClassification: PropertyRegistryAccessClassification.SEALED,
        propertyRecordId: 'pr-1',
        titleRecordId: 'tr-1',
        restrictions: [],
        verifications: [],
        titleRecord: {
          titleReference: 'TR-1',
          landParcel: { parcelReference: 'LP-1' },
          versions: [{ payloadSnapshot: { owner: 'secret' } }],
        },
      });

      await expect(service.getEntryForActor('citizen-1', 'entry-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PropertyEncumbranceService', () => {
    let service: PropertyEncumbranceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyEncumbranceService,
          PropertyRegistryBoundaryService,
          PropertyRegistryAuditService,
          { provide: PrismaService, useValue: {} },
        ],
      }).compile();

      service = module.get(PropertyEncumbranceService);
    });

    it('blocks silent encumbrance deletion', () => {
      expect(() => {
        service.assertDeleteBlocked();
      }).toThrow(ForbiddenException);
    });
  });

  describe('PropertyRegistryCorrectionService', () => {
    const prisma = {
      propertyRegistryCorrection: {
        create: jest.fn().mockResolvedValue({ id: 'corr-1' }),
      },
      propertyRegistryAuditEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    let service: PropertyRegistryCorrectionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyRegistryCorrectionService,
          PropertyRegistryBoundaryService,
          PropertyRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(PropertyRegistryCorrectionService);
      jest.clearAllMocks();
    });

    it('title correction preserves previous state', async () => {
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          titleVersion: {
            update: jest.fn(),
          },
          propertyRegistryCorrection: {
            update: jest.fn().mockResolvedValue({ id: 'corr-1' }),
          },
          propertyTransactionHistory: { create: jest.fn() },
        }),
      );

      await service.recordApprovedCorrection({
        correctionId: 'corr-1',
        previousTitleVersionId: 'tv-1',
        newTitleVersionId: 'tv-2',
        titleRecordId: 'tr-1',
        governmentDecisionId: 'dec-1',
        authorityEvaluationRecordId: 'auth-1',
        actorIdentityId: 'official-1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('rejects client self-approval of correction request', async () => {
      await expect(
        service.submitRequest('applicant-1', {
          propertyRegistryEntryId: 'entry-1',
          requestedChanges: { field: 'holder' },
          clientStatus: PropertyRegistryCorrectionStatus.APPROVED_FOR_CORRECTION,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PropertyRegistryVerificationService', () => {
    const prisma = {
      propertyRegistryVerification: { findUnique: jest.fn() },
    };

    let service: PropertyRegistryVerificationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyRegistryVerificationService,
          PropertyRegistryClassificationAccessService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(PropertyRegistryVerificationService);
    });

    it('public verification exposes only permitted registry information', async () => {
      prisma.propertyRegistryVerification.findUnique.mockResolvedValue({
        verificationState: 'VERIFIED',
        propertyRegistryEntry: {
          entryReference: 'PRE-1',
          registeredAt: new Date(),
          accessClassification: PropertyRegistryAccessClassification.SEALED,
          restrictions: [],
          titleRecord: { titleReference: 'TR-1' },
        },
      });

      const payload = await service.verifyPublic('code-1');
      expect(payload).not.toHaveProperty('restrictedPayload');
      expect(Object.keys(payload)).toEqual(
        expect.arrayContaining([
          'entryReference',
          'verificationState',
          'registeredAt',
          'titleReference',
        ]),
      );
    });
  });
});
