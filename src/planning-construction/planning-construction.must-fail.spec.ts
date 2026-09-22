import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  DevelopmentAccessActorKind,
  DevelopmentExternalDependencyStatus,
  DevelopmentInspectionOutcome,
  IdentityType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../authority/function-authority-records/function-authority-records.service';
import { PrismaService } from '../database/prisma.service';
import { PlanningConstructionAccessService } from './common/planning-construction-access.service';
import { PlanningConstructionAuthorityService } from './common/planning-construction-authority.service';
import { PlanningConstructionBoundaryService } from './common/planning-construction-boundary.service';
import { DevelopmentExternalDependencyService } from './external/development-external-dependency.service';
import { DevelopmentFeeService } from './fees/development-fee.service';
import { DevelopmentInspectionService } from './inspections/development-inspection.service';
import { DevelopmentOccupancyService } from './occupancy/development-occupancy.service';
import { DevelopmentPermitService } from './permits/development-permit.service';

describe('Planning & construction must-fail gates', () => {
  describe('PlanningConstructionBoundaryService', () => {
    let boundary: PlanningConstructionBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PlanningConstructionBoundaryService],
      }).compile();
      boundary = module.get(PlanningConstructionBoundaryService);
    });

    it('blocks applicant self-issuing a permit', () => {
      expect(() => {
        boundary.assertApplicantCannotSelfIssuePermit(DevelopmentAccessActorKind.APPLICANT);
      }).toThrow(ForbiddenException);
    });

    it('blocks professional self-approving a government permit', () => {
      expect(() => {
        boundary.assertProfessionalCannotSelfApprovePermit(DevelopmentAccessActorKind.PROFESSIONAL);
      }).toThrow(ForbiddenException);
    });

    it('blocks payment side-effects implying permit approval', () => {
      expect(() => {
        boundary.assertPaymentDoesNotApprovePermit('payment recorded; permit approved');
      }).toThrow(BadRequestException);
    });

    it('preserves inspection failure without reinspection', () => {
      expect(() => {
        boundary.assertInspectionFailurePreserved(
          DevelopmentInspectionOutcome.FAIL,
          DevelopmentInspectionOutcome.PASS,
          false,
        );
      }).toThrow(ForbiddenException);
    });

    it('enforces external dependencies before permit decision', () => {
      expect(() => {
        boundary.assertExternalDependenciesResolved([
          {
            blocksPermitDecision: true,
            status: DevelopmentExternalDependencyStatus.PENDING,
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('requires governed decision for occupancy issuance', () => {
      expect(() => {
        boundary.assertOccupancyRequiresGovernedDecision({
          governmentDecisionId: null,
          issuedByOfficeholderId: 'officeholder-1',
        });
      }).toThrow(BadRequestException);
    });
  });

  describe('PlanningConstructionAccessService', () => {
    const prisma = {
      developmentProject: { findUnique: jest.fn() },
      organizationMembership: { findFirst: jest.fn() },
      developmentAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: PlanningConstructionAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PlanningConstructionAccessService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(PlanningConstructionAccessService);
      jest.clearAllMocks();
    });

    it('isolates individual applicant project access', async () => {
      prisma.developmentProject.findUnique.mockResolvedValue({
        id: 'proj-1',
        primaryApplicantIdentityId: 'owner-2',
        organizationId: null,
      });

      await expect(
        access.assertProjectAccess({
          accessorIdentityId: 'owner-1',
          developmentProjectId: 'proj-1',
          actorKind: DevelopmentAccessActorKind.APPLICANT,
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('isolates business organization project scope', async () => {
      prisma.developmentProject.findUnique.mockResolvedValue({
        id: 'proj-1',
        primaryApplicantIdentityId: null,
        organizationId: 'org-1',
      });
      prisma.organizationMembership.findFirst.mockResolvedValue(null);

      await expect(
        access.assertProjectAccess({
          accessorIdentityId: 'member-1',
          developmentProjectId: 'proj-1',
          actorKind: DevelopmentAccessActorKind.REPRESENTATIVE,
          endpoint: 'test',
          organizationId: 'org-2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DevelopmentPermitService', () => {
    const prisma = {
      developmentPermit: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      developmentPermitVersion: { create: jest.fn() },
      developmentExternalDependency: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const authority = {
      assertPermitIssuanceAuthority: jest.fn(),
    };

    let service: DevelopmentPermitService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DevelopmentPermitService,
          PlanningConstructionBoundaryService,
          DevelopmentExternalDependencyService,
          { provide: PrismaService, useValue: prisma },
          { provide: PlanningConstructionAuthorityService, useValue: authority },
        ],
      }).compile();
      service = module.get(DevelopmentPermitService);
      jest.clearAllMocks();
      prisma.developmentExternalDependency.findMany.mockResolvedValue([]);
    });

    it('rejects applicant attempting to issue a permit', async () => {
      await expect(
        service.issuePermit({
          developmentProjectId: 'proj-1',
          permitType: 'BUILDING',
          actorKind: DevelopmentAccessActorKind.APPLICANT,
          actorIdentityType: IdentityType.INDIVIDUAL,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'identity-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects official without configured authority', async () => {
      authority.assertPermitIssuanceAuthority.mockRejectedValue(
        new ForbiddenException('PLANNING_PERMIT_AUTHORITY_NOT_CONFIGURED'),
      );

      await expect(
        service.issuePermit({
          developmentProjectId: 'proj-1',
          permitType: 'BUILDING',
          actorKind: DevelopmentAccessActorKind.PLANNING_OFFICER,
          actorIdentityType: IdentityType.INDIVIDUAL,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'identity-officer',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a new version for permit amendment', async () => {
      prisma.developmentPermit.findUnique.mockResolvedValue({
        id: 'permit-1',
        versions: [{ versionNumber: 1 }],
      });
      prisma.developmentPermitVersion.create.mockResolvedValue({
        id: 'v2',
        versionNumber: 2,
        isAmendment: true,
      });
      prisma.developmentPermit.update.mockResolvedValue({});

      await service.amendPermit({
        developmentPermitId: 'permit-1',
        amendmentSummary: 'Scope change',
        payload: { change: true },
      });

      expect(prisma.developmentPermitVersion.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('PlanningConstructionAuthorityService', () => {
    const functionRecords = { findByCode: jest.fn() };
    const authorityEvaluation = { evaluate: jest.fn() };

    let service: PlanningConstructionAuthorityService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PlanningConstructionAuthorityService,
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();
      service = module.get(PlanningConstructionAuthorityService);
      jest.clearAllMocks();
    });

    it('blocks permit issuance when authority function is not configured', async () => {
      functionRecords.findByCode.mockRejectedValue(new NotFoundException());

      await expect(
        service.assertPermitIssuanceAuthority({
          identityId: 'identity-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks permit issuance when authority evaluation denies', async () => {
      functionRecords.findByCode.mockResolvedValue({ id: 'far-1' });
      authorityEvaluation.evaluate.mockResolvedValue({ outcome: AuthorityEvaluationOutcome.DENY });

      await expect(
        service.assertPermitIssuanceAuthority({
          identityId: 'identity-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DevelopmentFeeService', () => {
    const prisma = {
      developmentProjectFee: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    let service: DevelopmentFeeService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DevelopmentFeeService,
          PlanningConstructionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DevelopmentFeeService);
      jest.clearAllMocks();
    });

    it('payment does not equal approval', async () => {
      prisma.developmentProjectFee.findUnique.mockResolvedValue({
        id: 'fee-1',
      });
      prisma.developmentProjectFee.update.mockResolvedValue({});

      const result = await service.recordPayment({
        developmentProjectFeeId: 'fee-1',
        paymentTransactionId: 'pay-1',
        actorKind: DevelopmentAccessActorKind.PAYMENT_SYSTEM,
      });

      expect(result.permitApproved).toBe(false);
    });
  });

  describe('DevelopmentInspectionService', () => {
    const prisma = {
      developmentInspection: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    let service: DevelopmentInspectionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DevelopmentInspectionService,
          PlanningConstructionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DevelopmentInspectionService);
      jest.clearAllMocks();
    });

    it('preserves recorded inspection failure', async () => {
      prisma.developmentInspection.findUnique.mockResolvedValue({
        id: 'insp-1',
        outcome: DevelopmentInspectionOutcome.FAIL,
      });

      await expect(
        service.recordOutcome({
          developmentInspectionId: 'insp-1',
          outcome: DevelopmentInspectionOutcome.PASS,
          actorKind: DevelopmentAccessActorKind.INSPECTOR,
          reinspectionRequested: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DevelopmentOccupancyService', () => {
    const prisma = {
      developmentProject: { findUnique: jest.fn() },
      developmentOccupancyCertificate: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    let service: DevelopmentOccupancyService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DevelopmentOccupancyService,
          PlanningConstructionBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DevelopmentOccupancyService);
      jest.clearAllMocks();
    });

    it('occupancy requires governed decision references', async () => {
      await expect(
        service.issueCertificate({
          developmentProjectId: 'proj-1',
          certificateReference: 'OCC-1',
          governmentDecisionId: '',
          issuedByOfficeholderId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
