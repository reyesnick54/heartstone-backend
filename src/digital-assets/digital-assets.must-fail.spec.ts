import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  DigitalAssetsActorPersona,
  DigitalAssetsDataClassification,
  DigitalAssetsExternalDependencyRecordedBy,
  DigitalAssetsExternalDependencyStatus,
  DigitalAssetsExternalDependencyType,
  DigitalAssetsTechnicalReviewStatus,
  IdentityType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../authority/function-authority-records/function-authority-records.service';
import { PrismaService } from '../database/prisma.service';
import { DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE } from '../service-catalog/service-packs/digital-assets-service-pack.template';
import { validateServicePackManifest } from '../service-catalog/service-packs/validate-service-pack';
import { DigitalAssetsAuthorizationService } from './authorization/digital-assets-authorization.service';
import { DigitalAssetsAccessService } from './common/digital-assets-access.service';
import { DigitalAssetsAuthorityService } from './common/digital-assets-authority.service';
import { DigitalAssetsBoundaryService } from './common/digital-assets-boundary.service';
import { DigitalAssetsComplianceReferenceService } from './compliance/digital-assets-compliance-reference.service';
import { DigitalAssetsConfigurationService } from './configuration/digital-assets-configuration.service';
import { DigitalAssetsRegulatedEntityService } from './entities/digital-assets-regulated-entity.service';
import { DigitalAssetsExternalDependencyService } from './external/digital-assets-external-dependency.service';
import { DigitalAssetsTechnicalReviewService } from './reviews/digital-assets-technical-review.service';

describe('Digital assets must-fail gates', () => {
  describe('DigitalAssetsBoundaryService', () => {
    let boundary: DigitalAssetsBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [DigitalAssetsBoundaryService],
      }).compile();
      boundary = module.get(DigitalAssetsBoundaryService);
    });

    it('blocks AI from approving authorization', () => {
      expect(() => {
        boundary.assertAiCannotApproveAuthorization(
          DigitalAssetsActorPersona.AI_ASSISTANCE,
          'APPROVE_DIGITAL_ASSETS_AUTHORIZATION',
        );
      }).toThrow(ForbiddenException);
    });

    it('blocks payment from approving authorization', () => {
      expect(() => {
        boundary.assertPaymentDoesNotApproveAuthorization(DigitalAssetsActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });

    it('blocks blockchain verification service from approving authorization', () => {
      expect(() => {
        boundary.assertBlockchainVerificationDoesNotApprove(
          DigitalAssetsActorPersona.BLOCKCHAIN_VERIFICATION_SERVICE,
        );
      }).toThrow(ForbiddenException);
    });

    it('enforces external dependencies before final decision', () => {
      expect(() => {
        boundary.assertExternalDependenciesResolved([
          {
            blocksFinalDecision: true,
            status: DigitalAssetsExternalDependencyStatus.PENDING,
          },
        ]);
      }).toThrow(BadRequestException);
    });
  });

  describe('DigitalAssetsAuthorityService', () => {
    const functionRecords = { findByCode: jest.fn() };
    const authorityEvaluation = { evaluate: jest.fn() };

    let service: DigitalAssetsAuthorityService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DigitalAssetsAuthorityService,
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();
      service = module.get(DigitalAssetsAuthorityService);
      jest.clearAllMocks();
    });

    it('blocks issuance when delegated authority function is absent', async () => {
      functionRecords.findByCode.mockRejectedValue(new NotFoundException());

      await expect(
        service.assertAuthorizationIssuanceAuthority({
          identityId: 'identity-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks issuance when authority evaluation denies', async () => {
      functionRecords.findByCode.mockResolvedValue({ id: 'far-1' });
      authorityEvaluation.evaluate.mockResolvedValue({ outcome: AuthorityEvaluationOutcome.DENY });

      await expect(
        service.assertAuthorizationIssuanceAuthority({
          identityId: 'identity-1',
          officeholderId: 'oh-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DigitalAssetsAuthorizationService', () => {
    const prisma = {
      digitalAssetsAuthorizationRecord: { create: jest.fn() },
    };
    const boundary = new DigitalAssetsBoundaryService();
    const authority = {
      assertAuthorizationIssuanceAuthority: jest.fn().mockResolvedValue(undefined),
    };
    const externalDependencies = {
      assertFinalDecisionAllowed: jest.fn().mockResolvedValue(undefined),
    };

    let service: DigitalAssetsAuthorizationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DigitalAssetsAuthorizationService,
          { provide: PrismaService, useValue: prisma },
          { provide: DigitalAssetsBoundaryService, useValue: boundary },
          { provide: DigitalAssetsAuthorityService, useValue: authority },
          { provide: DigitalAssetsExternalDependencyService, useValue: externalDependencies },
        ],
      }).compile();
      service = module.get(DigitalAssetsAuthorizationService);
      jest.clearAllMocks();
    });

    it('requires canonical decision and instrument for issuance', async () => {
      await expect(
        service.issueAuthorization({
          regulatedEntityId: 'entity-1',
          actorPersona: DigitalAssetsActorPersona.REGULATORY_OFFICER,
          actorIdentityType: IdentityType.INDIVIDUAL,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'identity-officer',
          governmentDecisionId: 'decision-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists official instrument reference when authority is active', async () => {
      prisma.digitalAssetsAuthorizationRecord.create.mockResolvedValue({
        officialInstrumentId: 'instrument-1',
        governmentDecisionId: 'decision-1',
      });

      const authorization = await service.issueAuthorization({
        regulatedEntityId: 'entity-1',
        actorPersona: DigitalAssetsActorPersona.REGULATORY_OFFICER,
        actorIdentityType: IdentityType.INDIVIDUAL,
        issuedByOfficeholderId: 'oh-1',
        issuerIdentityId: 'identity-officer',
        governmentDecisionId: 'decision-1',
        officialInstrumentId: 'instrument-1',
      });

      expect(authorization.officialInstrumentId).toBe('instrument-1');
      expect(authorization.governmentDecisionId).toBe('decision-1');
    });

    it('rejects service identities attempting issuance', async () => {
      await expect(
        service.issueAuthorization({
          regulatedEntityId: 'entity-1',
          actorPersona: DigitalAssetsActorPersona.REGULATORY_OFFICER,
          actorIdentityType: IdentityType.SERVICE,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'svc-identity',
          governmentDecisionId: 'decision-1',
          officialInstrumentId: 'instrument-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DigitalAssetsExternalDependencyService', () => {
    const prisma = {
      digitalAssetsExternalDependency: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    let service: DigitalAssetsExternalDependencyService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DigitalAssetsExternalDependencyService,
          DigitalAssetsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DigitalAssetsExternalDependencyService);
      jest.clearAllMocks();
    });

    it('records attributable external responses', async () => {
      prisma.digitalAssetsExternalDependency.create.mockResolvedValue({
        recordedByIdentityId: 'liaison-1',
        responseAttributionSummary: 'Financial regulator concurrence recorded',
      });

      const dependency = await service.recordExternalResponse(
        DigitalAssetsActorPersona.EXTERNAL_AUTHORITY_LIAISON,
        {
          regulatedEntityId: 'entity-1',
          dependencyType: DigitalAssetsExternalDependencyType.NATIONAL_FINANCIAL_REGULATOR,
          status: DigitalAssetsExternalDependencyStatus.RESOLVED,
          isAuthenticated: true,
          recordedBy: DigitalAssetsExternalDependencyRecordedBy.EXTERNAL_AUTHORITY_LIAISON,
          recordedByIdentityId: 'liaison-1',
          responseAttributionSummary: 'Financial regulator concurrence recorded',
        },
      );

      expect(dependency.recordedByIdentityId).toBe('liaison-1');
      expect(dependency.responseAttributionSummary).toBe(
        'Financial regulator concurrence recorded',
      );
    });
  });

  describe('DigitalAssetsAccessService', () => {
    const prisma = {
      digitalAssetsDataAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: DigitalAssetsAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [DigitalAssetsAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      access = module.get(DigitalAssetsAccessService);
    });

    it('denies confidential technical evidence without regulatory scope', async () => {
      await expect(
        access.assertConfidentialAccess({
          accessorIdentityId: 'identity-a',
          regulatedEntityId: 'entity-1',
          classification: DigitalAssetsDataClassification.CONFIDENTIAL_TECHNICAL,
          endpoint: 'test',
          hasRegulatoryOfficerScope: false,
          hasBeneficialOwnershipScope: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DigitalAssetsRegulatedEntityService', () => {
    const prisma = {
      digitalAssetsRegulatedEntityReference: {
        create: jest.fn().mockResolvedValue({
          organizationId: 'org-1',
          doesNotDuplicateOrganization: true,
          organization: { id: 'org-1' },
        }),
      },
    };

    let service: DigitalAssetsRegulatedEntityService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [DigitalAssetsRegulatedEntityService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      service = module.get(DigitalAssetsRegulatedEntityService);
    });

    it('links regulated entity to canonical organization', async () => {
      const result = await service.registerRegulatedEntity({
        organizationId: 'org-1',
        activityCategoryCode: 'CONFIGURED-VASP',
      });

      expect(result.organizationRecordsDuplicated).toBe(0);
      expect(result.entity.organizationId).toBe('org-1');
    });
  });

  describe('DigitalAssetsComplianceReferenceService', () => {
    const prisma = {
      digitalAssetsComplianceReference: {
        create: jest.fn().mockResolvedValue({ complianceMatterId: 'cm-1' }),
      },
    };

    let service: DigitalAssetsComplianceReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DigitalAssetsComplianceReferenceService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DigitalAssetsComplianceReferenceService);
    });

    it('integrates with canonical compliance matters', async () => {
      const result = await service.linkComplianceMatter({
        regulatedEntityId: 'entity-1',
        complianceMatterId: 'cm-1',
      });
      expect(result.complianceMatterId).toBe('cm-1');
    });
  });

  describe('DigitalAssetsConfigurationService', () => {
    const prisma = {
      digitalAssetsConfiguration: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    let service: DigitalAssetsConfigurationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [DigitalAssetsConfigurationService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      service = module.get(DigitalAssetsConfigurationService);
    });

    it('allows another institution to configure taxonomy without core-code changes', async () => {
      prisma.digitalAssetsConfiguration.findUnique.mockResolvedValue({
        activityCategoryTaxonomy: [{ code: 'CUSTODY', label: 'Custody services' }],
      });

      const label = await service.resolveActivityCategoryLabel('jurisdiction-b', 'CUSTODY');
      expect(label).toBe('Custody services');
    });
  });

  describe('DigitalAssetsTechnicalReviewService', () => {
    const prisma = {
      digitalAssetsTechnicalReviewRecord: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    let service: DigitalAssetsTechnicalReviewService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DigitalAssetsTechnicalReviewService,
          DigitalAssetsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(DigitalAssetsTechnicalReviewService);
    });

    it('cannot mark technical review as official approval', async () => {
      await expect(
        service.recordReviewerNotes({
          technicalReviewId: 'review-1',
          reviewerPersona: DigitalAssetsActorPersona.TECHNICAL_REVIEWER,
          summaryNotes: 'Architecture reviewed',
          status: DigitalAssetsTechnicalReviewStatus.COMPLETE,
          markOfficialApproval: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Service pack deployment', () => {
    it('deploys digital-asset services through governed service packs', () => {
      const result = validateServicePackManifest(DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE.services.length).toBeGreaterThan(0);
    });
  });
});
