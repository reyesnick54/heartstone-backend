import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  LabourActorPersona,
  RepresentativeAuthorityStatus,
  WorkPermitLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { LabourAccessService } from './common/labour-access.service';
import { LabourBoundaryService } from './common/labour-boundary.service';
import { EmploymentComplaintService } from './complaints/employment-complaint.service';
import { EmployerRegistryService } from './employers/employer-registry.service';
import { EmploymentContractReferenceService } from './employment/employment-contract-reference.service';
import { EmploymentRelationshipService } from './employment/employment-relationship.service';
import { WorkPermitApplicationProfileService } from './work-permits/work-permit-application-profile.service';
import { WorkPermitRecordService } from './work-permits/work-permit-record.service';

describe('Labour must-fail gates', () => {
  describe('LabourBoundaryService', () => {
    let boundary: LabourBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [LabourBoundaryService],
      }).compile();
      boundary = module.get(LabourBoundaryService);
    });

    it('employment contract does not create work permit', () => {
      expect(() => {
        boundary.assertEmploymentContractDoesNotCreateWorkPermit({
          doesNotIssueWorkPermit: true,
          workPermitsCreated: 1,
        });
      }).toThrow(BadRequestException);
    });

    it('employer cannot self-authorize worker', () => {
      expect(() => {
        boundary.assertEmployerCannotSelfAuthorizeWorker(
          LabourActorPersona.EMPLOYER,
          'SELF_AUTHORIZE_WORKER',
        );
      }).toThrow(ForbiddenException);
    });

    it('work permit does not create residency', () => {
      expect(() => {
        boundary.assertWorkPermitDoesNotCreateResidency({
          doesNotCreateResidency: true,
          residencyRecordsCreated: 1,
        });
      }).toThrow(BadRequestException);
    });

    it('residency does not create work permit', () => {
      expect(() => {
        boundary.assertResidencyDoesNotCreateWorkPermit(1);
      }).toThrow(BadRequestException);
    });

    it('payment does not approve permit', () => {
      expect(() => {
        boundary.assertPaymentDoesNotApproveWorkPermit(LabourActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });

    it('complaint does not equal violation', () => {
      expect(() => {
        boundary.assertComplaintIsNotVerifiedViolation(true, 'summary');
      }).toThrow(BadRequestException);
    });

    it('AI cannot approve work permit', () => {
      expect(() => {
        boundary.assertAiCannotApproveWorkPermit(
          LabourActorPersona.AI_ASSISTANCE,
          'APPROVE_WORK_PERMIT',
        );
      }).toThrow(ForbiddenException);
    });

    it('technical admin cannot create work authorization', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotCreateWorkAuthorization(
          LabourActorPersona.TECHNICAL_ADMIN,
        );
      }).toThrow(ForbiddenException);
    });
  });

  describe('LabourAccessService', () => {
    const prisma = {
      workerProfileReference: { findUnique: jest.fn() },
      employerRegistryRecord: { findUnique: jest.fn() },
      identity: { findFirst: jest.fn() },
      representativeAuthority: { findUnique: jest.fn() },
    };

    let access: LabourAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          LabourAccessService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(LabourAccessService);
      jest.clearAllMocks();
    });

    it('employee sees only authorized own records', async () => {
      prisma.workerProfileReference.findUnique.mockResolvedValue({
        id: 'wpr-1',
        workerIdentityId: 'worker-a',
      });

      await expect(
        access.assertWorkerSelfAccess({
          accessorIdentityId: 'worker-b',
          workerProfileReferenceId: 'wpr-1',
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('revoked employer representation blocks access', async () => {
      prisma.employerRegistryRecord.findUnique.mockResolvedValue({
        id: 'emp-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
      });
      prisma.identity.findFirst.mockResolvedValue(null);
      prisma.representativeAuthority.findUnique.mockResolvedValue({
        status: RepresentativeAuthorityStatus.REVOKED,
        identityId: 'rep-1',
        organizationId: 'org-1',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      });

      await expect(
        access.assertEmployerWorkforceAccess({
          accessorIdentityId: 'rep-1',
          employerRegistryRecordId: 'emp-1',
          endpoint: 'test',
          representativeAuthorityId: 'auth-revoked',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('employer sees only permitted workforce data when representative is inactive', async () => {
      prisma.employerRegistryRecord.findUnique.mockResolvedValue({
        id: 'emp-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
      });
      prisma.identity.findFirst.mockResolvedValue(null);
      prisma.representativeAuthority.findUnique.mockResolvedValue({
        status: RepresentativeAuthorityStatus.SUSPENDED,
        identityId: 'rep-1',
        organizationId: 'org-1',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      });

      await expect(
        access.assertEmployerWorkforceAccess({
          accessorIdentityId: 'rep-1',
          employerRegistryRecordId: 'emp-1',
          endpoint: 'test',
          representativeAuthorityId: 'auth-suspended',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('EmploymentContractReferenceService', () => {
    const prisma = {
      employmentContractReference: { create: jest.fn() },
    };

    let service: EmploymentContractReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EmploymentContractReferenceService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EmploymentContractReferenceService);
      jest.clearAllMocks();
    });

    it('returns zero work permits when linking contract reference', async () => {
      prisma.employmentContractReference.create.mockResolvedValue({
        id: 'ecr-1',
        doesNotIssueWorkPermit: true,
      });

      const result = await service.linkContractReference({
        employmentRelationshipId: 'rel-1',
        contractReferenceToken: 'token',
      });

      expect(result.workPermitsCreated).toBe(0);
    });
  });

  describe('WorkPermitApplicationProfileService', () => {
    const prisma = {
      workPermitApplicationProfile: { create: jest.fn() },
    };

    let service: WorkPermitApplicationProfileService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          WorkPermitApplicationProfileService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(WorkPermitApplicationProfileService);
      jest.clearAllMocks();
    });

    it('work permit application profile link does not issue permit', async () => {
      prisma.workPermitApplicationProfile.create.mockResolvedValue({
        id: 'wpap-1',
        doesNotIssueWorkPermit: true,
      });

      const result = await service.linkWorkPermitApplicationProfile({
        workerProfileReferenceId: 'wpr-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.workPermitsIssued).toBe(0);
    });
  });

  describe('WorkPermitRecordService', () => {
    const prisma = {
      workPermitRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      workPermitStatusHistory: {
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    let service: WorkPermitRecordService;

    beforeEach(async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      );
      const module = await Test.createTestingModule({
        providers: [
          WorkPermitRecordService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(WorkPermitRecordService);
      jest.clearAllMocks();
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      );
    });

    it('work permit history preserved on status transition', async () => {
      prisma.workPermitRecord.findUnique.mockResolvedValue({
        id: 'wp-1',
        lifecycleStatus: WorkPermitLifecycleStatus.ISSUED,
        governmentDecisionId: 'dec-1',
      });
      prisma.workPermitStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
      prisma.workPermitRecord.update.mockResolvedValue({
        id: 'wp-1',
        lifecycleStatus: WorkPermitLifecycleStatus.EFFECTIVE,
      });
      prisma.workPermitStatusHistory.count.mockResolvedValue(2);

      const result = await service.recordStatusTransition({
        workPermitRecordId: 'wp-1',
        toStatus: WorkPermitLifecycleStatus.EFFECTIVE,
        actorPersona: LabourActorPersona.LABOUR_OFFICER,
      });

      expect(result.historyEntries).toBe(2);
      expect(result.priorStatusPreserved).toBe(true);
      expect(prisma.workPermitStatusHistory.create).toHaveBeenCalled();
    });

    it('blocks destructive work permit overwrite when requested', async () => {
      prisma.workPermitRecord.findUnique.mockResolvedValue({
        id: 'wp-1',
        lifecycleStatus: WorkPermitLifecycleStatus.ISSUED,
      });

      await expect(
        service.recordStatusTransition({
          workPermitRecordId: 'wp-1',
          toStatus: WorkPermitLifecycleStatus.REVOKED,
          actorPersona: LabourActorPersona.LABOUR_OFFICER,
          destructiveOverwrite: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('EmploymentRelationshipService', () => {
    const prisma = {
      employmentRelationship: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      employmentRelationshipHistory: {
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    let service: EmploymentRelationshipService;

    beforeEach(async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      );
      const module = await Test.createTestingModule({
        providers: [
          EmploymentRelationshipService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EmploymentRelationshipService);
      jest.clearAllMocks();
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      );
    });

    it('employment relationship history preserved on update', async () => {
      prisma.employmentRelationship.findUnique.mockResolvedValue({
        id: 'rel-1',
        employerRegistryRecordId: 'emp-1',
        workerProfileReferenceId: 'wpr-1',
        roleTitle: 'Analyst',
        startDate: new Date('2024-01-01'),
        endDate: null,
        currentWorkPermitRecordId: null,
        history: [{ id: 'hist-existing' }],
      });
      prisma.employmentRelationshipHistory.create.mockResolvedValue({ id: 'hist-2' });
      prisma.employmentRelationship.update.mockResolvedValue({
        id: 'rel-1',
        roleTitle: 'Senior Analyst',
      });
      prisma.employmentRelationshipHistory.count.mockResolvedValue(2);

      const result = await service.updateRelationshipPreservingHistory({
        employmentRelationshipId: 'rel-1',
        roleTitle: 'Senior Analyst',
        actorPersona: LabourActorPersona.LABOUR_OFFICER,
      });

      expect(result.historyEntries).toBe(2);
      expect(result.priorSnapshotPreserved).toBe(true);
    });
  });

  describe('EmployerRegistryService', () => {
    const prisma = {
      employerRegistryRecord: { create: jest.fn() },
    };

    let service: EmployerRegistryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EmployerRegistryService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EmployerRegistryService);
      jest.clearAllMocks();
    });

    it('employer registry registration does not authorize workers', async () => {
      prisma.employerRegistryRecord.create.mockResolvedValue({
        id: 'emp-1',
        doesNotSelfAuthorizeWorkers: true,
      });

      const record = await service.registerEmployer({
        organizationId: 'org-1',
      });

      expect(record.doesNotSelfAuthorizeWorkers).toBe(true);
    });
  });

  describe('EmploymentComplaintService', () => {
    const prisma = {
      employmentComplaint: { create: jest.fn() },
    };

    let service: EmploymentComplaintService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EmploymentComplaintService,
          LabourBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EmploymentComplaintService);
      jest.clearAllMocks();
    });

    it('creates complaints with isVerifiedViolation false', async () => {
      prisma.employmentComplaint.create.mockResolvedValue({
        id: 'cmp-1',
        isVerifiedViolation: false,
      });

      const complaint = await service.fileComplaint({
        complaintSummary: 'Alleged unpaid wages',
      });

      expect(complaint.isVerifiedViolation).toBe(false);
    });
  });
});
