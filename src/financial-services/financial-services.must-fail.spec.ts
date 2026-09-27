import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  FinancialDelegatedFunctionActivation,
  FinancialExternalRegulatoryDependencyStatus,
  FinancialServicesActorPersona,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../authority/function-authority-records/function-authority-records.service';
import { PrismaService } from '../database/prisma.service';
import { FinancialLicenceApplicationProfileService } from './applications/financial-licence-application-profile.service';
import { FinancialServicesAccessService } from './common/financial-services-access.service';
import { FinancialServicesAuthorityService } from './common/financial-services-authority.service';
import { FinancialServicesBoundaryService } from './common/financial-services-boundary.service';
import { FinancialExternalRegulatoryDependencyService } from './external/financial-external-regulatory-dependency.service';
import { FinancialLicenceRecordService } from './licences/financial-licence-record.service';

describe('Financial services must-fail gates', () => {
  describe('FinancialServicesBoundaryService', () => {
    let boundary: FinancialServicesBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [FinancialServicesBoundaryService],
      }).compile();
      boundary = module.get(FinancialServicesBoundaryService);
    });

    it('blocks delegated issuance when function is INACTIVE', () => {
      expect(() => {
        boundary.assertDelegatedFunctionActiveForIssuance(
          FinancialDelegatedFunctionActivation.INACTIVE,
          true,
        );
      }).toThrow(ForbiddenException);
    });

    it('blocks unresolved external regulatory dependencies', () => {
      expect(() => {
        boundary.assertExternalDependenciesResolved([
          {
            blocksAbsezLicenceDecision: true,
            status: FinancialExternalRegulatoryDependencyStatus.AWAITING_EXTERNAL_DETERMINATION,
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('blocks spoofed national approval as ABSEZ issuance', () => {
      expect(() => {
        boundary.assertCannotSpoofNationalApprovalAsAbsez({
          requiresNationalDetermination: true,
          absezIssuanceAuthorized: true,
          externalResolved: false,
        });
      }).toThrow(ForbiddenException);
    });

    it('blocks applicant regulatory file access', () => {
      expect(() => {
        boundary.assertRegulatoryFileAccessDenied(FinancialServicesActorPersona.APPLICANT);
      }).toThrow(ForbiddenException);
    });

    it('blocks suspension without authority evidence', () => {
      expect(() => {
        boundary.assertSuspensionRequiresConfiguredAuthority({});
      }).toThrow(ForbiddenException);
    });
  });

  describe('FinancialLicenceRecordService', () => {
    const prisma = {
      financialRegulatedEntityProfile: { findUnique: jest.fn() },
      financialLicenceApplicationProfile: { findUnique: jest.fn() },
      financialLicenceRecord: { create: jest.fn() },
      financialExternalRegulatoryDependency: { findMany: jest.fn(), count: jest.fn() },
    };
    const boundary = {
      rejectClientForgedLicenceFields: jest.fn(),
      assertApplicantCannotSelfIssueLicence: jest.fn(),
      assertTechnicalAdminCannotIssueLicence: jest.fn(),
      assertAiCannotIssueLicence: jest.fn(),
      assertDelegatedFunctionActiveForIssuance: jest.fn(),
      assertCannotSpoofNationalApprovalAsAbsez: jest.fn(),
    };
    const authority = { assertLicenceIssuanceAuthority: jest.fn() };
    const external = {
      assertLicenceDecisionAllowed: jest.fn(),
      countAwaitingExternal: jest.fn().mockResolvedValue(1),
    };

    let service: FinancialLicenceRecordService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          FinancialLicenceRecordService,
          { provide: PrismaService, useValue: prisma },
          { provide: FinancialServicesBoundaryService, useValue: boundary },
          { provide: FinancialServicesAuthorityService, useValue: authority },
          { provide: FinancialExternalRegulatoryDependencyService, useValue: external },
        ],
      }).compile();
      service = module.get(FinancialLicenceRecordService);
      jest.clearAllMocks();
      prisma.financialRegulatedEntityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        delegatedLicenceFunctionActivation: FinancialDelegatedFunctionActivation.INACTIVE,
      });
      prisma.financialLicenceApplicationProfile.findUnique.mockResolvedValue({
        requiresNationalDetermination: true,
      });
      authority.assertLicenceIssuanceAuthority.mockResolvedValue(undefined);
      external.assertLicenceDecisionAllowed.mockResolvedValue(undefined);
    });

    it('rejects licence issuance when national determination unresolved', async () => {
      boundary.assertCannotSpoofNationalApprovalAsAbsez.mockImplementation(() => {
        throw new ForbiddenException('spoof');
      });

      await expect(
        service.issueLicence({
          regulatedEntityProfileId: 'profile-1',
          actorPersona: FinancialServicesActorPersona.FINANCIAL_SERVICES_OFFICER,
          issuerIdentityId: 'id-1',
          issuedByOfficeholderId: 'oh-1',
          governmentDecisionId: 'dec-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FinancialServicesAuthorityService', () => {
    it('requires configured authority for issuance', async () => {
      const authorityEvaluation = {
        evaluate: jest.fn().mockResolvedValue({ outcome: AuthorityEvaluationOutcome.DENY }),
      };
      const functionRecords = {
        findByCode: jest.fn().mockResolvedValue({ id: 'far-1' }),
      };

      const module = await Test.createTestingModule({
        providers: [
          FinancialServicesAuthorityService,
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
        ],
      }).compile();

      const service = module.get(FinancialServicesAuthorityService);

      await expect(
        service.assertLicenceIssuanceAuthority({
          identityId: 'id-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('fails when function authority record is missing', async () => {
      const functionRecords = {
        findByCode: jest.fn().mockRejectedValue(new NotFoundException()),
      };

      const module = await Test.createTestingModule({
        providers: [
          FinancialServicesAuthorityService,
          { provide: AuthorityEvaluationService, useValue: { evaluate: jest.fn() } },
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
        ],
      }).compile();

      const service = module.get(FinancialServicesAuthorityService);

      await expect(
        service.assertLicenceIssuanceAuthority({
          identityId: 'id-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FinancialLicenceApplicationProfileService', () => {
    it('does not issue licence at application link time', async () => {
      const prisma = {
        financialRegulatedEntityProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 'profile-1' }),
        },
        financialLicenceApplicationProfile: { create: jest.fn() },
      };

      const module = await Test.createTestingModule({
        providers: [
          FinancialLicenceApplicationProfileService,
          FinancialServicesBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const service = module.get(FinancialLicenceApplicationProfileService);

      await expect(
        service.linkApplicationProfile({
          regulatedEntityProfileId: 'profile-1',
          activityCategoryCode: 'PAYMENT_SERVICES',
          licencesCreated: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('FinancialServicesAccessService', () => {
    const prisma = {
      financialRegulatedEntityProfile: { findUnique: jest.fn() },
      representativeAuthority: { findUnique: jest.fn() },
      financialRegulatoryAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: FinancialServicesAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          FinancialServicesAccessService,
          FinancialServicesBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(FinancialServicesAccessService);
      jest.clearAllMocks();
      prisma.financialRegulatedEntityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        organizationId: 'org-1',
      });
    });

    it('denies applicant access to regulatory files', async () => {
      await expect(
        access.assertRegulatedEntityAccess({
          accessorIdentityId: 'user-1',
          regulatedEntityProfileId: 'profile-1',
          actorPersona: FinancialServicesActorPersona.APPLICANT,
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
