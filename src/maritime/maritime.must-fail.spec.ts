import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  IdentityType,
  MaritimeActorPersona,
  MaritimeDataClassification,
  MaritimeExternalDependencyRecordedBy,
  MaritimeExternalDependencyStatus,
  MaritimeExternalDependencyType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../authority/function-authority-records/function-authority-records.service';
import { PrismaService } from '../database/prisma.service';
import { MARITIME_SERVICE_PACK_TEMPLATE } from '../service-catalog/service-packs/maritime-service-pack.template';
import { MaritimeAccessService } from './common/maritime-access.service';
import { MaritimeAuthorityService } from './common/maritime-authority.service';
import { MaritimeBoundaryService } from './common/maritime-boundary.service';
import { MaritimeExternalDependencyService } from './external/maritime-external-dependency.service';
import { MaritimeVesselInspectionService } from './inspections/maritime-vessel-inspection.service';
import { MaritimeInstrumentService } from './instruments/maritime-instrument.service';
import { MARITIME_FOUNDATION_MODEL_NAMES } from './maritime-schema.constants';
import { VesselRecordService } from './vessels/vessel-record.service';

describe('Maritime must-fail gates', () => {
  describe('canonical vessel record', () => {
    it('declares VesselRecord in foundation models', () => {
      expect(MARITIME_FOUNDATION_MODEL_NAMES).toContain('VesselRecord');
    });

    it('returns no duplicated organization identity from registration', async () => {
      const prisma = {
        vesselRecord: { create: jest.fn().mockResolvedValue({ id: 'v1' }) },
        vesselOfficialRegistrationReference: { create: jest.fn() },
        vesselProvenanceRecord: { create: jest.fn() },
      };
      const module = await Test.createTestingModule({
        providers: [VesselRecordService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(VesselRecordService);
      const result = await service.registerVessel({ vesselName: 'Example' });
      expect(result.organizationIdentityDuplicated).toBe(false);
      expect(result.personIdentityDuplicated).toBe(false);
      expect(prisma.vesselRecord.create).toHaveBeenCalled();
    });
  });

  describe('MaritimeBoundaryService', () => {
    let boundary: MaritimeBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [MaritimeBoundaryService],
      }).compile();
      boundary = module.get(MaritimeBoundaryService);
    });

    it('blocks unresolved external dependencies', () => {
      expect(() => {
        boundary.assertExternalDependenciesResolved([
          {
            blocksAbsezAdministrativeDecision: true,
            status: MaritimeExternalDependencyStatus.PENDING,
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('blocks spoofed national approval as ABSEZ issuance', () => {
      expect(() => {
        boundary.assertCannotSpoofNationalDeterminationAsAbsez({
          requiresCompetentAuthorityDetermination: true,
          absezIssuanceAttempt: true,
          externalResolved: false,
        });
      }).toThrow(ForbiddenException);
    });

    it('blocks maritime approval substituting customs release', () => {
      expect(() => {
        boundary.assertMaritimeApprovalDoesNotAuthorizeCustomsRelease(false);
      }).toThrow(BadRequestException);
    });
  });

  describe('Maritime service pack deployment', () => {
    it('exposes template-blue-economy-maritime pack with vessel form bindings', () => {
      expect(MARITIME_SERVICE_PACK_TEMPLATE.packId).toBe('template-blue-economy-maritime');
      expect(MARITIME_SERVICE_PACK_TEMPLATE.services.length).toBeGreaterThan(0);
    });
  });

  describe('MaritimeExternalDependencyService', () => {
    it('records external determination without replacing competent authority', async () => {
      const prisma = {
        maritimeExternalDependency: { create: jest.fn().mockResolvedValue({ id: 'dep-1' }) },
      };
      const boundary = { rejectApplicantForgedExternalResponse: jest.fn() };
      const module = await Test.createTestingModule({
        providers: [
          MaritimeExternalDependencyService,
          { provide: PrismaService, useValue: prisma },
          { provide: MaritimeBoundaryService, useValue: boundary },
        ],
      }).compile();
      const service = module.get(MaritimeExternalDependencyService);
      await service.recordExternalDetermination(MaritimeActorPersona.MARITIME_OFFICER, {
        vesselRecordId: 'v1',
        dependencyType: MaritimeExternalDependencyType.COMPETENT_REGISTRATION_AUTHORITY,
        status: MaritimeExternalDependencyStatus.RESOLVED,
        recordedBy: MaritimeExternalDependencyRecordedBy.MARITIME_OFFICER,
        externalDecisionReference: 'EXT-REF-1',
      });
      expect(boundary.rejectApplicantForgedExternalResponse).not.toHaveBeenCalledWith(
        MaritimeActorPersona.APPLICANT,
      );
      expect(prisma.maritimeExternalDependency.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('MaritimeInstrumentService', () => {
    const prisma = { maritimeAdministrativeInstrument: { create: jest.fn() } };
    const boundary = {
      rejectClientInstrumentFields: jest.fn(),
      assertApplicantCannotSelfIssue: jest.fn(),
      assertPaymentDoesNotIssueInstrument: jest.fn(),
      assertCannotSpoofNationalDeterminationAsAbsez: jest.fn(),
      assertInstrumentRequiresGovernedOutcome: jest.fn(),
    };
    const authority = { assertInstrumentIssuanceAuthority: jest.fn() };
    const external = {
      countAwaitingExternal: jest.fn().mockResolvedValue(1),
      assertAdministrativeDecisionAllowed: jest.fn(),
    };

    let service: MaritimeInstrumentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          MaritimeInstrumentService,
          { provide: PrismaService, useValue: prisma },
          { provide: MaritimeBoundaryService, useValue: boundary },
          { provide: MaritimeAuthorityService, useValue: authority },
          { provide: MaritimeExternalDependencyService, useValue: external },
        ],
      }).compile();
      service = module.get(MaritimeInstrumentService);
      jest.clearAllMocks();
      boundary.assertCannotSpoofNationalDeterminationAsAbsez.mockImplementation(() => {
        throw new ForbiddenException('spoof');
      });
    });

    it('rejects instrument issuance when national determination unresolved', async () => {
      await expect(
        service.issueInstrument({
          vesselRecordId: 'v1',
          actorPersona: MaritimeActorPersona.MARITIME_OFFICER,
          actorIdentityType: IdentityType.INDIVIDUAL,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'id-1',
          requiresCompetentAuthorityDetermination: true,
          governmentDecisionId: 'dec-1',
          officialInstrumentId: 'inst-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('MaritimeVesselInspectionService', () => {
    it('links canonical inspection infrastructure', async () => {
      const prisma = {
        maritimeVesselInspectionReference: {
          create: jest.fn().mockResolvedValue({ inspectionRecordId: 'insp-1' }),
        },
      };
      const boundary = {
        assertMaritimeApprovalDoesNotAuthorizeCustomsRelease: jest.fn(),
      };
      const module = await Test.createTestingModule({
        providers: [
          MaritimeVesselInspectionService,
          { provide: PrismaService, useValue: prisma },
          { provide: MaritimeBoundaryService, useValue: boundary },
        ],
      }).compile();
      const service = module.get(MaritimeVesselInspectionService);
      await service.linkCanonicalInspection({
        vesselRecordId: 'v1',
        inspectionRecordId: 'insp-1',
      });
      expect(prisma.maritimeVesselInspectionReference.create).toHaveBeenCalled();
    });
  });

  describe('MaritimeAuthorityService', () => {
    it('requires configured authority for issuance', async () => {
      const authorityEvaluation = {
        evaluate: jest.fn().mockResolvedValue({ outcome: AuthorityEvaluationOutcome.DENY }),
      };
      const functionRecords = {
        findByCode: jest.fn().mockResolvedValue({ id: 'far-1' }),
      };
      const module = await Test.createTestingModule({
        providers: [
          MaritimeAuthorityService,
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
        ],
      }).compile();
      const service = module.get(MaritimeAuthorityService);
      await expect(
        service.assertInstrumentIssuanceAuthority({
          identityId: 'id-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('MaritimeAccessService', () => {
    it('enforces institution isolation and access policy', async () => {
      const prisma = {
        vesselRecord: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'v1',
            institutionId: 'inst-a',
          }),
        },
        maritimeDataAccessAudit: { create: jest.fn() },
      };
      const module = await Test.createTestingModule({
        providers: [MaritimeAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(MaritimeAccessService);
      await expect(
        service.assertConfidentialAccess({
          accessorIdentityId: 'id-1',
          vesselRecordId: 'v1',
          accessorInstitutionId: 'inst-b',
          classification: MaritimeDataClassification.REGULATORY_ACCESS,
          endpoint: '/maritime/vessels/v1',
          hasMaritimeOfficerScope: true,
          hasSecuritySensitiveScope: false,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.maritimeDataAccessAudit.create).toHaveBeenCalled();
    });

    it('denies confidential vessel data without officer scope', async () => {
      const prisma = {
        vesselRecord: {
          findUnique: jest.fn().mockResolvedValue({ id: 'v1', institutionId: 'inst-a' }),
        },
        maritimeDataAccessAudit: { create: jest.fn() },
      };
      const module = await Test.createTestingModule({
        providers: [MaritimeAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(MaritimeAccessService);
      await expect(
        service.assertConfidentialAccess({
          accessorIdentityId: 'id-1',
          vesselRecordId: 'v1',
          accessorInstitutionId: 'inst-a',
          classification: MaritimeDataClassification.CONFIDENTIAL_COMMERCIAL,
          endpoint: '/maritime/vessels/v1',
          hasMaritimeOfficerScope: false,
          hasSecuritySensitiveScope: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
