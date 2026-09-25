import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AssuranceLevel,
  DriverLicenseLifecycleStatus,
  DriverTestRecordOutcome,
  TransportationActorPersona,
  TransportationRegistryLifecycleStatus,
  VehicleOwnershipPartyType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { SubjectRecordAccessService } from '../institutional-scope/subject-record-access.service';
import { TransportationAccessService } from './access/transportation-access.service';
import { DriverLicenseApplicationProfileService } from './applications/driver-license-application-profile.service';
import { TransportationExperienceBoundaryService } from './boundary/transportation-experience-boundary.service';
import { TransportationBoundaryService } from './common/transportation-boundary.service';
import { resolveDriverLicenseLifecycle } from './common/transportation-credential.util';
import { sanitizeMedicalReferenceForTransportation } from './common/transportation-medical-sanitizer.util';
import { FleetAccessService } from './fleet/fleet-access.service';
import { VehicleInspectionLinkService } from './inspections/vehicle-inspection-link.service';
import { DriverLicenseRecordService } from './licensing/driver-license-record.service';
import { DriverMedicalReferenceService } from './medical/driver-medical-reference.service';
import { VehicleOwnershipService } from './ownership/vehicle-ownership.service';
import { DriverProfileService } from './profiles/driver-profile.service';
import { TransportationStatusService } from './status/transportation-status.service';
import { DriverTestRecordService } from './tests/driver-test-record.service';
import { PublicVehicleVerificationService } from './verification/public-vehicle-verification.service';

describe('Transportation must-fail gates', () => {
  describe('TransportationBoundaryService', () => {
    let boundary: TransportationBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TransportationBoundaryService],
      }).compile();
      boundary = module.get(TransportationBoundaryService);
    });

    it('payment does not issue driver license', () => {
      expect(() => {
        boundary.assertPaymentDoesNotIssueDriverLicense(TransportationActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });

    it('AI cannot approve driver license', () => {
      expect(() => {
        boundary.assertAiCannotApproveDriverLicense('APPROVE_DRIVER_LICENSE');
      }).toThrow(ForbiddenException);
    });

    it('technical admin cannot issue driver license', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotIssueDriverLicense(
          TransportationActorPersona.TECHNICAL_ADMIN,
          'DRIVER_LICENSE',
        );
      }).toThrow(ForbiddenException);
    });

    it('citizen cannot register another person vehicle without authority', () => {
      expect(() => {
        boundary.assertCitizenCannotRegisterAnotherOwnersVehicle({
          requesterIdentityId: 'citizen-a',
          ownerIdentityId: 'citizen-b',
          hasRepresentativeAuthority: false,
        });
      }).toThrow(ForbiddenException);
    });

    it('business fleet access requires organization scope', () => {
      expect(() => {
        boundary.assertFleetOrganizationScope({
          organizationId: 'org-fleet',
          requesterOrganizationId: 'org-other',
          authorizedScope: { viewFleetVehicles: true },
          requested: 'viewFleetVehicles',
        });
      }).toThrow(ForbiddenException);
    });

    it('failed inspection does not silently revoke registration unless governed action occurs', () => {
      expect(() => {
        boundary.assertFailedInspectionDoesNotRevokeRegistration({
          inspectionResultDoesNotRevokeRegistration: true,
          registrationRevokedWithoutDecision: true,
        });
      }).toThrow(BadRequestException);
    });
  });

  describe('DriverLicenseApplicationProfileService', () => {
    const prisma = {
      driverLicenseApplicationProfile: { create: jest.fn() },
    };

    let service: DriverLicenseApplicationProfileService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DriverLicenseApplicationProfileService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: SubjectRecordAccessService,
            useValue: { assertApplicationLinkedRecord: jest.fn() },
          },
        ],
      }).compile();
      service = module.get(DriverLicenseApplicationProfileService);
      jest.clearAllMocks();
    });

    it('license application does not create driver license', async () => {
      prisma.driverLicenseApplicationProfile.create.mockResolvedValue({
        id: 'dlap-1',
        doesNotIssueDriverLicense: true,
      });

      const result = await service.linkDriverLicenseApplicationProfile({
        driverProfileId: 'drv-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.driverLicenseRecordsCreated).toBe(0);
      expect(result.profile.doesNotIssueDriverLicense).toBe(true);
    });
  });

  describe('DriverTestRecordService', () => {
    const prisma = {
      driverTestRecord: { create: jest.fn().mockResolvedValue({ id: 'test-1' }) },
    };

    let service: DriverTestRecordService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DriverTestRecordService,
          TransportationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DriverTestRecordService);
    });

    it('passing test does not itself issue license', async () => {
      const result = await service.recordTestResult({
        driverProfileId: 'drv-1',
        outcome: DriverTestRecordOutcome.PASSED,
      });
      expect(result.driverLicensesIssued).toBe(0);
      expect(prisma.driverTestRecord.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('DriverLicenseRecordService', () => {
    it('blocks technical admin issuance at boundary before persistence', async () => {
      const prisma = {
        driverLicenseRecord: { create: jest.fn() },
        driverProfile: { update: jest.fn() },
      };
      const statusService = { recordDriverLicenseStatus: jest.fn() };
      const module = await Test.createTestingModule({
        providers: [
          DriverLicenseRecordService,
          TransportationBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: TransportationStatusService, useValue: statusService },
        ],
      }).compile();
      const service = module.get(DriverLicenseRecordService);

      await expect(
        service.authorizeIssuance({
          driverProfileId: 'drv-1',
          governmentDecisionId: 'dec-1',
          actorPersona: TransportationActorPersona.TECHNICAL_ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('VehicleOwnershipService transfer history', () => {
    const tx = {
      vehicleOwnershipRecord: {
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'own-2' }),
      },
      vehicleTransfer: { create: jest.fn().mockResolvedValue({ id: 'xfr-1' }) },
      vehicleOwnershipHistory: { create: jest.fn(), count: jest.fn().mockResolvedValue(2) },
      vehicleRecord: { update: jest.fn() },
    };

    const prisma = {
      vehicleRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'veh-1',
          currentOwnershipRecord: { id: 'own-1' },
        }),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };

    let service: VehicleOwnershipService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          VehicleOwnershipService,
          TransportationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(VehicleOwnershipService);
      jest.clearAllMocks();
    });

    it('vehicle transfer preserves ownership history', async () => {
      const result = await service.transferOwnership({
        vehicleRecordId: 'veh-1',
        fromOwnershipRecordId: 'own-1',
        toOwnerPartyType: VehicleOwnershipPartyType.IDENTITY,
        toOwnerIdentityId: 'owner-2',
      });

      expect(result.priorOwnershipPreserved).toBe(true);
      expect(result.ownershipHistoryEntries).toBe(2);
      expect(tx.vehicleOwnershipRecord.update).toHaveBeenCalled();
    });
  });

  describe('DriverMedicalReferenceService', () => {
    it('medical determination details not leaked through transportation domain', async () => {
      const prisma = {
        driverMedicalRequirementReference: {
          create: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            referenceNumber: 'DMED-1',
            determinationReferenceToken: 'token-abc',
            determinationStatus: 'SATISFIED',
            determinationSummaryCode: 'FIT_TO_DRIVE',
            satisfiedAt: new Date(),
            storesDiagnosis: false,
            diagnosis: 'should-not-leak',
          }),
        },
      };
      const module = await Test.createTestingModule({
        providers: [DriverMedicalReferenceService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(DriverMedicalReferenceService);
      const sanitized = await service.getSanitizedReference('ref-1');
      expect(sanitized).not.toHaveProperty('diagnosis');
      expect(sanitizeMedicalReferenceForTransportation({ diagnosis: 'hidden', ok: true })).toEqual({
        ok: true,
      });
    });
  });

  describe('PublicVehicleVerificationService', () => {
    it('public vehicle verification is data-minimized', async () => {
      const prisma = {
        vehicleRecord: {
          findUnique: jest.fn().mockResolvedValue({
            vehicleCategoryCode: 'PASSENGER',
            currentOwnershipRecordId: 'own-secret',
            jurisdiction: { code: 'JUR-1' },
            currentRegistration: { lifecycleStatus: 'ACTIVE', isCurrent: true },
          }),
        },
      };
      const module = await Test.createTestingModule({
        providers: [PublicVehicleVerificationService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(PublicVehicleVerificationService);
      const result = await service.verifyByPublicToken('token');
      expect(result).not.toHaveProperty('ownerIdentityId');
      expect(result).not.toHaveProperty('vin');
      expect(result).toHaveProperty('disclaimer');
    });
  });

  describe('TransportationStatusService suspended license audit', () => {
    it('suspended license state preserved and auditable', async () => {
      const prisma = {
        transportationStatusHistory: {
          create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
          count: jest.fn().mockResolvedValue(3),
        },
      };
      const module = await Test.createTestingModule({
        providers: [TransportationStatusService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(TransportationStatusService);
      const result = await service.recordDriverLicenseStatus({
        driverProfileId: 'drv-1',
        driverLicenseRecordId: 'lic-1',
        toLifecycleStatus: TransportationRegistryLifecycleStatus.SUSPENDED,
        statusCode: DriverLicenseLifecycleStatus.SUSPENDED,
        actorPersona: TransportationActorPersona.TRANSPORTATION_OFFICER,
      });
      expect(result.historyEntries).toBe(3);
    });
  });

  describe('Driver profile cross-subject access', () => {
    it('blocks cross-subject profile reads', async () => {
      const prisma = { driverProfile: { findFirst: jest.fn() } };
      const subjectRecordAccess = {
        assertSubjectIdentityVisible: jest
          .fn()
          .mockRejectedValue(new NotFoundException('Driver profile not found')),
      };
      const module = await Test.createTestingModule({
        providers: [
          DriverProfileService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubjectRecordAccessService, useValue: subjectRecordAccess },
        ],
      }).compile();
      const service = module.get(DriverProfileService);
      const session = {
        sessionId: '11111111-1111-4111-8111-111111111111',
        identityId: 'other',
        assuranceLevel: AssuranceLevel.HIGH,
      };
      await expect(service.getProfileForSubject(session, 'subject-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('FleetAccessService', () => {
    it('denies fleet access without organization match', async () => {
      const prisma = {
        fleetRecord: { findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-a' }) },
      };
      const module = await Test.createTestingModule({
        providers: [
          FleetAccessService,
          TransportationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      const service = module.get(FleetAccessService);
      await expect(
        service.assertFleetVehicleAccess({
          fleetRecordId: 'fleet-1',
          requesterOrganizationId: 'org-b',
          scope: { viewFleetVehicles: true },
          requested: 'viewFleetVehicles',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('VehicleInspectionLinkService', () => {
    it('rejects silent registration revocation from failed inspection', async () => {
      const prisma = { vehicleInspection: { create: jest.fn() } };
      const module = await Test.createTestingModule({
        providers: [
          VehicleInspectionLinkService,
          TransportationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      const service = module.get(VehicleInspectionLinkService);
      await expect(
        service.linkInspectionResult({
          vehicleRecordId: 'veh-1',
          inspectionRecordId: 'insp-1',
          registrationRevokedWithoutDecision: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Driver license lifecycle', () => {
    it('expired driver license represented correctly', () => {
      const effective = resolveDriverLicenseLifecycle({
        lifecycleStatus: DriverLicenseLifecycleStatus.EFFECTIVE,
        validUntil: new Date('2020-01-01'),
        now: new Date('2025-01-01'),
      });
      expect(effective).toBe(DriverLicenseLifecycleStatus.EXPIRED);
    });
  });

  describe('TransportationAccessService', () => {
    it('enforces applicant ownership scope', () => {
      const module = Test.createTestingModule({
        providers: [TransportationAccessService, TransportationBoundaryService],
      }).compile();
      return module.then((m) => {
        const service = m.get(TransportationAccessService);
        expect(() => {
          service.assertApplicantOwnsDriverProfile('a', 'b');
        }).toThrow(ForbiddenException);
      });
    });
  });

  describe('TransportationExperienceBoundaryService', () => {
    it('strips medical detail fields from citizen payload', () => {
      const boundary = new TransportationExperienceBoundaryService();
      const sanitized = boundary.sanitizeCitizenPayload({
        status: 'OK',
        diagnosis: 'hidden',
      });
      expect(sanitized).not.toHaveProperty('diagnosis');
      expect(sanitized.status).toBe('OK');
    });
  });
});
