import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PropertyAccessActorKind,
  PropertyEncumbranceKind,
  PropertyPublicVerificationMode,
  PropertyTransferDecisionOutcome,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { PropertyCertificateService } from './certificates/property-certificate.service';
import { PropertyRegistryAccessService } from './common/property-registry-access.service';
import { PropertyRegistryBoundaryService } from './common/property-registry-boundary.service';
import { PropertyRegistryConfigurationService } from './configuration/property-registry-configuration.service';
import { PropertyEncumbranceService } from './encumbrances/property-encumbrance.service';
import { PropertySurveyService } from './surveys/property-survey.service';
import { PropertyTransferService } from './transfers/property-transfer.service';
import { PublicPropertyRegistryVerificationService } from './verification/public-property-registry-verification.service';

describe('Property registry must-fail gates', () => {
  describe('PropertyRegistryBoundaryService', () => {
    let boundary: PropertyRegistryBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PropertyRegistryBoundaryService],
      }).compile();
      boundary = module.get(PropertyRegistryBoundaryService);
    });

    it('blocks transfer application title mutation flag', () => {
      expect(() => { boundary.assertApplicationCannotMutateTitle(true); }).toThrow(ForbiddenException);
    });

    it('requires transfer decision before registry change', () => {
      expect(() => { boundary.assertTransferDecisionRequired(false); }).toThrow(ForbiddenException);
    });

    it('blocks survey submission that alters parcel geometry', () => {
      expect(() => { boundary.assertSurveyDoesNotAlterParcel(true); }).toThrow(BadRequestException);
    });

    it('blocks platform admin title mutation', () => {
      expect(() => { boundary.assertPlatformAdminCannotAlterTitle('PLATFORM_ADMIN'); }).toThrow(
        ForbiddenException,
      );
    });

    it('minimizes public verification payload', () => {
      const payload = boundary.sanitizePublicVerificationPayload({
        parcelReference: 'PARCEL-1',
        status: 'REGISTERED',
        administrativeAddressSummary: 'District A',
        internalParcelIdentifier: 'SECRET-ID',
        sealedDataReference: 'SEALED',
      });
      expect(payload).not.toHaveProperty('internalParcelIdentifier');
      expect(payload).not.toHaveProperty('sealedDataReference');
      expect(Object.keys(payload)).toEqual([
        'parcelReference',
        'status',
        'locationSummary',
        'verificationTimestamp',
      ]);
    });
  });

  describe('PropertyRegistryAccessService', () => {
    const prisma = {
      propertyParcel: { findUnique: jest.fn() },
      propertyInterest: { findFirst: jest.fn() },
      propertyInterestEntitlement: { findFirst: jest.fn() },
      representativeAuthority: { findUnique: jest.fn() },
      propertyAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: PropertyRegistryAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PropertyRegistryAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      access = module.get(PropertyRegistryAccessService);
      jest.clearAllMocks();
    });

    it('denies citizen access to unrelated parcel', async () => {
      prisma.propertyParcel.findUnique.mockResolvedValue({ id: 'parcel-1' });
      prisma.propertyInterest.findFirst.mockResolvedValue(null);
      prisma.propertyInterestEntitlement.findFirst.mockResolvedValue(null);

      await expect(
        access.assertParcelAccess({
          accessorIdentityId: 'citizen-1',
          parcelId: 'parcel-1',
          actorKind: PropertyAccessActorKind.OWNER,
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PropertyTransferService', () => {
    const tx = {
      propertyInterest: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      propertyOwnershipHistory: { create: jest.fn() },
      propertyParcel: { update: jest.fn() },
      propertyInterestEntitlement: { upsert: jest.fn() },
    };
    const prisma = {
      propertyRegistryApplication: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      propertyInterest: tx.propertyInterest,
      propertyOwnershipHistory: tx.propertyOwnershipHistory,
      propertyParcel: tx.propertyParcel,
      propertyInterestEntitlement: tx.propertyInterestEntitlement,
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    let transfers: PropertyTransferService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertyTransferService,
          PropertyRegistryBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      transfers = module.get(PropertyTransferService);
      jest.clearAllMocks();
    });

    it('creates transfer application without mutating title', async () => {
      prisma.propertyRegistryApplication.create.mockResolvedValue({ id: 'app-1', mayMutateTitle: false });
      const created = await transfers.submitTransferApplication({
        parcelId: 'parcel-1',
        applicantIdentityId: 'citizen-1',
      });
      expect(created.mayMutateTitle).toBe(false);
    });

    it('blocks registry transfer without approved decision', async () => {
      prisma.propertyRegistryApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        applicationType: 'TRANSFER',
        parcelId: 'parcel-1',
        parcel: { id: 'parcel-1', registryVersion: 1 },
        transferDecision: { outcome: PropertyTransferDecisionOutcome.DENIED, id: 'dec-1' },
      });

      await expect(
        transfers.registerTransferAfterDecision({
          applicationId: 'app-1',
          newOwnerIdentityId: 'citizen-2',
          decidedByIdentityId: 'officer-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PropertySurveyService', () => {
    const prisma = {
      propertyParcel: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'p1', registryVersion: 2 }) },
      propertyRegistryApplication: { create: jest.fn().mockResolvedValue({ id: 'app-sv' }) },
      propertySurveySubmission: {
        create: jest.fn().mockResolvedValue({ altersParcelGeometry: false }),
      },
    };

    it('records survey without altering parcel geometry flag', async () => {
      const module = await Test.createTestingModule({
        providers: [
          PropertySurveyService,
          PropertyRegistryBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      const surveys = module.get(PropertySurveyService);
      const submission = await surveys.submitSurveyPlan({
        parcelId: 'p1',
        applicantIdentityId: 'citizen-1',
      });
      expect(submission.altersParcelGeometry).toBe(false);
    });
  });

  describe('PropertyEncumbranceService', () => {
    it('preserves encumbrance history on release', async () => {
      const prisma = {
        propertyEncumbrance: {
          update: jest.fn().mockResolvedValue({
            id: 'enc-1',
            parcelId: 'parcel-1',
            encumbranceKind: PropertyEncumbranceKind.MORTGAGE,
          }),
        },
        propertyEncumbranceHistory: { create: jest.fn() },
      };
      const module = await Test.createTestingModule({
        providers: [PropertyEncumbranceService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const encumbrances = module.get(PropertyEncumbranceService);
      await encumbrances.releaseEncumbrance('enc-1');
      expect(prisma.propertyEncumbranceHistory.create).toHaveBeenCalled();
    });
  });

  describe('PropertyCertificateService', () => {
    it('issued certificate references registry version', async () => {
      const prisma = {
        propertyParcel: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'p1', registryVersion: 4, parcelReference: 'PR-1' }) },
        propertyRegistryCertificate: {
          create: jest.fn().mockImplementation(({ data }: { data: { registryVersionNumber: number } }) => data),
        },
      };
      const module = await Test.createTestingModule({
        providers: [
          PropertyCertificateService,
          PropertyRegistryBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      const certificates = module.get(PropertyCertificateService);
      const issued = await certificates.issueCertificate({
        parcelId: 'p1',
        issuedByIdentityId: 'officer-1',
      });
      expect(issued.registryVersionNumber).toBe(4);
    });
  });

  describe('PublicPropertyRegistryVerificationService', () => {
    it('rejects public lookup when disabled', async () => {
      const configurationService = {
        getDefaultConfiguration: jest.fn().mockResolvedValue({
          publicVerificationMode: PropertyPublicVerificationMode.DISABLED,
        }),
      };
      const module = await Test.createTestingModule({
        providers: [
          PublicPropertyRegistryVerificationService,
          PropertyRegistryBoundaryService,
          { provide: PropertyRegistryConfigurationService, useValue: configurationService },
          { provide: PrismaService, useValue: { propertyParcel: { findFirst: jest.fn() } } },
        ],
      }).compile();
      const verification = module.get(PublicPropertyRegistryVerificationService);
      await expect(verification.verify('PARCEL-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
