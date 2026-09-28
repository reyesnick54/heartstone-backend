import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CannabisAdministrationActorPersona,
  CannabisAdministrationDataClassification,
  CannabisDelegatedLicenceFunctionActivation,
  CannabisServiceOperationalActivation,
  IdentityType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../authority/function-authority-records/function-authority-records.service';
import { PrismaService } from '../database/prisma.service';
import { CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE } from '../service-catalog/service-packs/cannabis-administration-service-pack.template';
import { validateServicePackManifest } from '../service-catalog/service-packs/validate-service-pack';
import { CannabisAdministrationAccessService } from './common/cannabis-administration-access.service';
import { CannabisAdministrationAuthorityService } from './common/cannabis-administration-authority.service';
import { CannabisAdministrationBoundaryService } from './common/cannabis-administration-boundary.service';
import { CannabisAdministrationConfigurationService } from './configuration/cannabis-administration-configuration.service';
import { CannabisRegulatedEntityService } from './entities/cannabis-regulated-entity.service';
import { CannabisExternalDependencyService } from './external/cannabis-external-dependency.service';
import { CannabisLicenceRecordService } from './licences/cannabis-licence-record.service';
import { CannabisLicenceSuspensionService } from './licences/cannabis-licence-suspension.service';
import { CannabisRegulatoryReferenceService } from './regulatory/cannabis-regulatory-reference.service';
import { CannabisFacilitySiteReferenceService } from './sites/cannabis-facility-site-reference.service';

describe('Cannabis administration must-fail gates', () => {
  describe('CannabisAdministrationBoundaryService', () => {
    let boundary: CannabisAdministrationBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CannabisAdministrationBoundaryService],
      }).compile();
      boundary = module.get(CannabisAdministrationBoundaryService);
    });

    it('blocks payment from approving licence', () => {
      expect(() => {
        boundary.assertPaymentDoesNotApproveLicence(
          CannabisAdministrationActorPersona.PAYMENT_SYSTEM,
        );
      }).toThrow(ForbiddenException);
    });

    it('blocks inspection linkage from recording final sanction', () => {
      expect(() => {
        boundary.assertInspectionFindingIsNotFinalSanction(true);
      }).toThrow(BadRequestException);
    });

    it('blocks suspension without authority evidence', () => {
      expect(() => {
        boundary.assertSuspensionRequiresConfiguredAuthority({});
      }).toThrow(ForbiddenException);
    });
  });

  describe('CannabisAdministrationConfigurationService', () => {
    const prisma = {
      cannabisAdministrationConfiguration: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    let service: CannabisAdministrationConfigurationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisAdministrationConfigurationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CannabisAdministrationConfigurationService);
      jest.clearAllMocks();
    });

    it('1. service cannot activate without configured governing authority', async () => {
      prisma.cannabisAdministrationConfiguration.findUnique.mockResolvedValue({
        governingAuthorityInstrumentId: null,
        serviceOperationalActivation: CannabisServiceOperationalActivation.INACTIVE,
      });

      await expect(
        service.assertServiceOperationalActivationAllowed('jurisdiction-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('2. licence categories come from configuration', async () => {
      prisma.cannabisAdministrationConfiguration.findUnique.mockResolvedValue({
        licenceCategoryTaxonomy: [{ code: 'CONFIGURED-CATEGORY', label: 'Configured category' }],
      });

      const label = await service.resolveLicenceCategoryLabel(
        'jurisdiction-1',
        'CONFIGURED-CATEGORY',
      );
      expect(label).toBe('Configured category');
    });
  });

  describe('CannabisRegulatedEntityService', () => {
    const prisma = {
      cannabisRegulatedEntityReference: {
        create: jest.fn().mockResolvedValue({
          organizationId: 'org-1',
          doesNotDuplicateOrganization: true,
          organization: { id: 'org-1' },
        }),
      },
    };
    const configuration = {
      assertLicenceCategoryConfigured: jest.fn().mockResolvedValue(undefined),
    };

    let service: CannabisRegulatedEntityService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisRegulatedEntityService,
          { provide: PrismaService, useValue: prisma },
          { provide: CannabisAdministrationConfigurationService, useValue: configuration },
        ],
      }).compile();
      service = module.get(CannabisRegulatedEntityService);
    });

    it('3. regulated entity uses canonical Organization', async () => {
      const result = await service.registerRegulatedEntity({
        organizationId: 'org-1',
        licenceCategoryCode: 'PENDING-CONFIGURATION',
      });

      expect(result.organizationRecordsDuplicated).toBe(0);
      expect(result.entity.organizationId).toBe('org-1');
    });
  });

  describe('CannabisFacilitySiteReferenceService', () => {
    const prisma = {
      cannabisFacilitySiteReference: {
        create: jest.fn().mockResolvedValue({
          landParcelId: 'parcel-1',
          doesNotCreateLandOrPlanningRecords: true,
        }),
      },
    };

    let service: CannabisFacilitySiteReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisFacilitySiteReferenceService,
          CannabisAdministrationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CannabisFacilitySiteReferenceService);
    });

    it('4. site uses canonical property/planning references', async () => {
      const site = await service.linkFacilitySite({
        regulatedEntityId: 'entity-1',
        landParcelId: 'parcel-1',
      });

      expect(site.landParcelId).toBe('parcel-1');
      expect(site.doesNotCreateLandOrPlanningRecords).toBe(true);
    });

    it('rejects attempts to create land or planning records from cannabis module', async () => {
      await expect(
        service.linkFacilitySite({
          regulatedEntityId: 'entity-1',
          createLandParcel: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CannabisLicenceRecordService', () => {
    const prisma = {
      cannabisRegulatedEntityReference: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'entity-1',
          jurisdictionId: 'jurisdiction-1',
          delegatedLicenceFunctionActivation: CannabisDelegatedLicenceFunctionActivation.ACTIVE,
        }),
      },
      cannabisLicenceRecord: { create: jest.fn() },
    };
    const boundary = new CannabisAdministrationBoundaryService();
    const authority = { assertLicenceIssuanceAuthority: jest.fn().mockResolvedValue(undefined) };
    const external = { assertLicenceDecisionAllowed: jest.fn().mockResolvedValue(undefined) };
    const configuration = {
      assertServiceOperationalActivationAllowed: jest.fn().mockResolvedValue(undefined),
      assertLicenceCategoryConfigured: jest.fn().mockResolvedValue(undefined),
    };

    let service: CannabisLicenceRecordService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisLicenceRecordService,
          { provide: PrismaService, useValue: prisma },
          { provide: CannabisAdministrationBoundaryService, useValue: boundary },
          { provide: CannabisAdministrationAuthorityService, useValue: authority },
          { provide: CannabisExternalDependencyService, useValue: external },
          { provide: CannabisAdministrationConfigurationService, useValue: configuration },
        ],
      }).compile();
      service = module.get(CannabisLicenceRecordService);
    });

    it('5. payment does not approve', async () => {
      await expect(
        service.issueLicence({
          regulatedEntityId: 'entity-1',
          licenceCategoryCode: 'CONFIGURED',
          actorPersona: CannabisAdministrationActorPersona.PAYMENT_SYSTEM,
          actorIdentityType: IdentityType.SERVICE,
          issuerIdentityId: 'pay-1',
          issuedByOfficeholderId: 'oh-1',
          governmentDecisionId: 'decision-1',
          officialInstrumentId: 'instrument-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('6. AI/service identity cannot issue licence', async () => {
      await expect(
        service.issueLicence({
          regulatedEntityId: 'entity-1',
          licenceCategoryCode: 'CONFIGURED',
          actorPersona: CannabisAdministrationActorPersona.REGULATORY_OFFICER,
          actorIdentityType: IdentityType.SERVICE,
          issuerIdentityId: 'svc-1',
          issuedByOfficeholderId: 'oh-1',
          governmentDecisionId: 'decision-1',
          officialInstrumentId: 'instrument-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('9. official licence uses canonical signing/issuance', async () => {
      prisma.cannabisLicenceRecord.create.mockResolvedValue({
        officialInstrumentId: 'instrument-1',
        governmentDecisionId: 'decision-1',
      });

      const licence = await service.issueLicence({
        regulatedEntityId: 'entity-1',
        licenceCategoryCode: 'CONFIGURED',
        actorPersona: CannabisAdministrationActorPersona.REGULATORY_OFFICER,
        actorIdentityType: IdentityType.INDIVIDUAL,
        issuerIdentityId: 'officer-1',
        issuedByOfficeholderId: 'oh-1',
        governmentDecisionId: 'decision-1',
        officialInstrumentId: 'instrument-1',
      });

      expect(licence.officialInstrumentId).toBe('instrument-1');
      expect(licence.governmentDecisionId).toBe('decision-1');
    });
  });

  describe('CannabisRegulatoryReferenceService', () => {
    const prisma = {
      cannabisInspectionReference: { create: jest.fn().mockResolvedValue({}) },
      cannabisComplianceReference: { create: jest.fn().mockResolvedValue({}) },
    };

    let service: CannabisRegulatoryReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisRegulatoryReferenceService,
          CannabisAdministrationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CannabisRegulatoryReferenceService);
    });

    it('7. inspection does not automatically create sanction', async () => {
      await expect(
        service.linkInspectionRecord({
          regulatedEntityId: 'entity-1',
          inspectionRecordId: 'inspection-1',
          isFinalSanctionDecision: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CannabisLicenceSuspensionService', () => {
    const prisma = {
      cannabisLicenceRecord: {
        findUnique: jest.fn().mockResolvedValue({ id: 'licence-1', lifecycleStatus: 'ISSUED' }),
        update: jest.fn(),
      },
      cannabisLicenceStatusHistory: { create: jest.fn() },
    };
    const boundary = new CannabisAdministrationBoundaryService();
    const authority = { assertLicenceSuspensionAuthority: jest.fn().mockResolvedValue(undefined) };

    let service: CannabisLicenceSuspensionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisLicenceSuspensionService,
          { provide: PrismaService, useValue: prisma },
          { provide: CannabisAdministrationBoundaryService, useValue: boundary },
          { provide: CannabisAdministrationAuthorityService, useValue: authority },
        ],
      }).compile();
      service = module.get(CannabisLicenceSuspensionService);
    });

    it('8. suspension/revocation requires authority', async () => {
      await expect(
        service.suspendLicence({
          cannabisLicenceRecordId: 'licence-1',
          actorPersona: CannabisAdministrationActorPersona.REGULATORY_OFFICER,
          actorIdentityId: 'officer-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CannabisAdministrationAccessService', () => {
    const prisma = {
      cannabisRegulatedEntityReference: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'entity-1',
          dataClassification: CannabisAdministrationDataClassification.REGULATORY_ACCESS,
        }),
      },
      cannabisDataAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: CannabisAdministrationAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CannabisAdministrationAccessService,
          CannabisAdministrationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(CannabisAdministrationAccessService);
    });

    it('10. unauthorized record access is denied', async () => {
      await expect(
        access.assertRegulatedEntityAccess({
          accessorIdentityId: 'user-1',
          regulatedEntityId: 'entity-1',
          actorPersona: CannabisAdministrationActorPersona.APPLICANT,
          endpoint: 'test',
          hasRegulatoryOfficerScope: false,
          hasBeneficialOwnershipScope: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CannabisAdministrationAuthorityService', () => {
    it('blocks issuance when authority function is absent', async () => {
      const functionRecords = { findByCode: jest.fn().mockRejectedValue(new NotFoundException()) };
      const module = await Test.createTestingModule({
        providers: [
          CannabisAdministrationAuthorityService,
          { provide: AuthorityEvaluationService, useValue: { evaluate: jest.fn() } },
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
        ],
      }).compile();

      const service = module.get(CannabisAdministrationAuthorityService);

      await expect(
        service.assertLicenceIssuanceAuthority({
          identityId: 'id-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks issuance when authority evaluation denies', async () => {
      const functionRecords = { findByCode: jest.fn().mockResolvedValue({ id: 'far-1' }) };
      const authorityEvaluation = {
        evaluate: jest.fn().mockResolvedValue({ outcome: AuthorityEvaluationOutcome.DENY }),
      };
      const module = await Test.createTestingModule({
        providers: [
          CannabisAdministrationAuthorityService,
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
        ],
      }).compile();

      const service = module.get(CannabisAdministrationAuthorityService);

      await expect(
        service.assertLicenceIssuanceAuthority({
          identityId: 'id-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Service pack deployment', () => {
    it('expresses cannabis services through governed service packs', () => {
      const result = validateServicePackManifest(CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
