import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CivilRecordAmendmentBasis,
  CivilRecordCorrectionRequestStatus,
  CivilRegistryAccessClassification,
  VitalEventRegistrationStatus,
  VitalEventType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CivilRecordAmendmentService } from './amendments/civil-record-amendment.service';
import { CivilRegistryAuditService } from './audit/civil-registry-audit.service';
import { CivilRegistryCertificateService } from './certificates/civil-registry-certificate.service';
import { PLATFORM_ADMIN_ROLE_MARKER } from './civil-registry.constants';
import { CivilRegistryClassificationAccessService } from './common/civil-registry-access.service';
import { CivilRegistryBoundaryService } from './common/civil-registry-boundary.service';
import { CivilRegistryCanonicalPathService } from './common/civil-registry-canonical-path.service';
import { CivilRecordCorrectionService } from './corrections/civil-record-correction.service';
import { VitalEventIntakeService } from './intake/vital-event-intake.service';
import { CivilRegistryReadService } from './queries/civil-registry-read.service';
import { CivilRegistryRegistrationService } from './registration/civil-registry-registration.service';

describe('Civil registry must-fail gates', () => {
  describe('CivilRegistryBoundaryService', () => {
    let boundary: CivilRegistryBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CivilRegistryBoundaryService],
      }).compile();
      boundary = module.get(CivilRegistryBoundaryService);
    });

    it('citizen submission cannot directly create official registry entry', () => {
      expect(() => {
        boundary.assertCitizenCannotCreateOfficialRegistryEntry({ creatingRegistryEntry: true });
      }).toThrow(ForbiddenException);
    });

    it('registry status cannot be client-forged on vital events', () => {
      expect(() => {
        boundary.rejectClientForgedVitalEventFields({
          registrationStatus: VitalEventRegistrationStatus.REGISTERED_OFFICIAL,
        });
      }).toThrow(ForbiddenException);
    });

    it('ordinary platform admin cannot alter official civil fact', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotAlterOfficialFact({
          actorRoleMarker: PLATFORM_ADMIN_ROLE_MARKER,
          mutatesOfficialRegistryPayload: true,
        });
      }).toThrow(ForbiddenException);
    });

    it('authority evaluation required for official registration', () => {
      expect(() => {
        boundary.assertAuthorityEvaluationRequired(undefined);
      }).toThrow(BadRequestException);
    });

    it('AI cannot register or amend a vital event', () => {
      expect(() => {
        boundary.assertAiCannotRegisterOrAmend('REGISTER_VITAL_EVENT', true);
      }).toThrow(ForbiddenException);
    });

    it('deletion of historical registry entry blocked', () => {
      expect(() => {
        boundary.assertHistoricalRegistryDeletionBlocked();
      }).toThrow(ForbiddenException);
    });

    it('correction request != correction approval on client submit', () => {
      expect(() => {
        boundary.assertCorrectionRequestIsNotApproval(
          CivilRecordCorrectionRequestStatus.APPROVED_FOR_AMENDMENT,
        );
      }).toThrow(BadRequestException);
    });

    it('official certificate must reference authoritative registry state', () => {
      expect(() => {
        boundary.assertCertificateReferencesAuthoritativeVersion({});
      }).toThrow(BadRequestException);
    });
  });

  describe('CivilRegistryClassificationAccessService', () => {
    let access: CivilRegistryClassificationAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CivilRegistryClassificationAccessService],
      }).compile();
      access = module.get(CivilRegistryClassificationAccessService);
    });

    it('sealed/restricted record not exposed to unauthorized actors', () => {
      expect(() => {
        access.assertMayReadEntry({
          actorIdentityId: 'identity-other',
          accessClassification: CivilRegistryAccessClassification.SEALED,
          linkedSubjectIdentityId: 'identity-subject',
        });
      }).toThrow(ForbiddenException);
    });

    it('cross-citizen access fails for subject-access records', () => {
      expect(() => {
        access.assertMayReadEntry({
          actorIdentityId: 'identity-a',
          accessClassification: CivilRegistryAccessClassification.SUBJECT_ACCESS,
          linkedSubjectIdentityId: 'identity-b',
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe('CivilRegistryRegistrationService', () => {
    const prisma = {
      authorityEvaluationRecord: { findUnique: jest.fn() },
      vitalEvent: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    let service: CivilRegistryRegistrationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CivilRegistryRegistrationService,
          CivilRegistryBoundaryService,
          CivilRegistryAuditService,
          CivilRegistryCanonicalPathService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(CivilRegistryRegistrationService);
      jest.clearAllMocks();
      prisma.authorityEvaluationRecord.findUnique.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.DENY,
      });
      prisma.vitalEvent.findUnique.mockResolvedValue({ id: 've-1', registryEntry: null });
    });

    it('blocks registration when authority evaluation is not permitted', async () => {
      await expect(
        service.recordOfficialEntry('official-1', {
          vitalEventId: 've-1',
          caseId: 'case-1',
          jurisdictionId: 'j-1',
          institutionId: 'i-1',
          governmentDecisionId: 'dec-1',
          authorityEvaluationRecordId: 'auth-1',
          registrarOfficeholderId: 'oh-1',
          registrarIdentityId: 'official-1',
          payloadSnapshot: { eventType: 'BIRTH' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks AI from recording official registry entry', async () => {
      prisma.authorityEvaluationRecord.findUnique.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
      });

      await expect(
        service.recordOfficialEntry('official-1', {
          vitalEventId: 've-1',
          caseId: 'case-1',
          jurisdictionId: 'j-1',
          institutionId: 'i-1',
          governmentDecisionId: 'dec-1',
          authorityEvaluationRecordId: 'auth-1',
          registrarOfficeholderId: 'oh-1',
          registrarIdentityId: 'official-1',
          payloadSnapshot: { eventType: 'BIRTH' },
          isAiActor: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CivilRecordAmendmentService', () => {
    const prisma = {
      civilRegistryEntry: { findUnique: jest.fn() },
      civilRegistryAuditEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    let service: CivilRecordAmendmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CivilRecordAmendmentService,
          CivilRegistryBoundaryService,
          CivilRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(CivilRecordAmendmentService);
      jest.clearAllMocks();
    });

    it('amendment preserves historical version via transaction path', async () => {
      prisma.civilRegistryEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        currentVersionNumber: 1,
        versions: [{ id: 'v1', payloadSnapshot: { name: 'Original' } }],
      });

      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          civilRegistryVersion: {
            update: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'v2' }),
          },
          civilRecordAmendment: {
            create: jest.fn().mockResolvedValue({ id: 'amend-1' }),
          },
          civilRegistryEntry: { update: jest.fn() },
        }),
      );

      const result = await service.recordAmendment('official-1', {
        civilRegistryEntryId: 'entry-1',
        basis: CivilRecordAmendmentBasis.AUTHORITY_DECISION,
        governmentDecisionId: 'dec-1',
        authorityEvaluationRecordId: 'auth-1',
        fieldPath: 'name',
        previousValue: 'Original',
        newValue: 'Corrected',
        effectiveDate: new Date(),
      });

      expect(result.previousVersion.id).toBe('v1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('CivilRegistryReadService', () => {
    const prisma = {
      civilRegistryEntry: { findUnique: jest.fn() },
    };

    let service: CivilRegistryReadService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CivilRegistryReadService,
          CivilRegistryClassificationAccessService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(CivilRegistryReadService);
      jest.clearAllMocks();
    });

    it('masks sealed entries as not found for unauthorized readers', async () => {
      prisma.civilRegistryEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        entryReference: 'CRE-ABC',
        status: 'OFFICIAL',
        accessClassification: CivilRegistryAccessClassification.SEALED,
        registeredAt: new Date(),
        currentVersionNumber: 1,
        restrictions: [],
        civilPersonRecord: { person: { identities: [] } },
        versions: [{ payloadSnapshot: {} }],
      });

      await expect(service.getEntryForActor('citizen-1', 'entry-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('VitalEventIntakeService', () => {
    const prisma = {
      vitalEvent: { create: jest.fn().mockResolvedValue({ id: 've-1' }) },
      birthEvent: { create: jest.fn() },
      deathEvent: { create: jest.fn() },
      marriageEvent: { create: jest.fn() },
      divorceEvent: { create: jest.fn() },
      civilRegistryAuditEvent: { create: jest.fn() },
    };

    let service: VitalEventIntakeService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          VitalEventIntakeService,
          CivilRegistryBoundaryService,
          CivilRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(VitalEventIntakeService);
      jest.clearAllMocks();
    });

    it('rejects client-forged official status on intake', async () => {
      await expect(
        service.createIntake('applicant-1', {
          eventType: VitalEventType.BIRTH,
          jurisdictionId: 'j-1',
          institutionId: 'i-1',
          clientPayload: { registrationStatus: VitalEventRegistrationStatus.REGISTERED_OFFICIAL },
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.vitalEvent.create).not.toHaveBeenCalled();
    });

    it('creates intake in INTAKE_DRAFT without registry entry', async () => {
      await service.createIntake('applicant-1', {
        eventType: VitalEventType.BIRTH,
        jurisdictionId: 'j-1',
        institutionId: 'i-1',
      });

      expect(prisma.vitalEvent.create).toHaveBeenCalled();
      const [[createArgs]] = prisma.vitalEvent.create.mock.calls as [
        [{ data: { registrationStatus: VitalEventRegistrationStatus } }],
      ];
      expect(createArgs.data.registrationStatus).toBe(VitalEventRegistrationStatus.INTAKE_DRAFT);
    });
  });

  describe('CivilRecordCorrectionService', () => {
    const prisma = {
      civilRecordCorrectionRequest: {
        create: jest.fn().mockResolvedValue({ id: 'req-1' }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      civilRegistryAuditEvent: { create: jest.fn() },
    };

    let service: CivilRecordCorrectionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CivilRecordCorrectionService,
          CivilRegistryBoundaryService,
          CivilRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(CivilRecordCorrectionService);
      jest.clearAllMocks();
    });

    it('rejects client attempt to self-approve correction request', async () => {
      await expect(
        service.submitRequest('applicant-1', {
          subjectCivilPersonRecordId: 'cpr-1',
          requestedChanges: { field: 'name' },
          clientStatus: CivilRecordCorrectionRequestStatus.APPROVED_FOR_AMENDMENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CivilRegistryCertificateService', () => {
    const prisma = {
      civilRegistryEntry: { findUnique: jest.fn() },
      civilRegistryVersion: { findUnique: jest.fn() },
      civilRegistryCertificateExtract: { create: jest.fn() },
      civilRegistryAuditEvent: { create: jest.fn() },
    };

    let service: CivilRegistryCertificateService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CivilRegistryCertificateService,
          CivilRegistryBoundaryService,
          CivilRegistryAuditService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(CivilRegistryCertificateService);
      jest.clearAllMocks();
    });

    it('requires certificate extract to pin an authoritative registry version', async () => {
      prisma.civilRegistryEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        versions: [{ id: 'v-current' }],
      });

      await expect(
        service.issueExtract('issuer-1', {
          civilRegistryEntryId: 'entry-1',
          civilRegistryVersionId: 'v-stale',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
