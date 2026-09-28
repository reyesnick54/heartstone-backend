import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CarbonExternalVerificationCategory,
  CarbonExternalVerificationRecordedBy,
  CarbonExternalVerificationStatus,
  CarbonManagementActorPersona,
  CarbonManagementDataClassification,
  IdentityType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../authority/function-authority-records/function-authority-records.service';
import { PrismaService } from '../database/prisma.service';
import { CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE } from '../service-catalog/service-packs/carbon-management-service-pack.template';
import { validateServicePackManifest } from '../service-catalog/service-packs/validate-service-pack';
import { CarbonAdministrativeAuthorizationService } from './authorization/carbon-administrative-authorization.service';
import { CarbonManagementAccessService } from './common/carbon-management-access.service';
import { CarbonManagementAuthorityService } from './common/carbon-management-authority.service';
import { CarbonManagementBoundaryService } from './common/carbon-management-boundary.service';
import { CarbonManagementComplianceReferenceService } from './compliance/carbon-management-compliance-reference.service';
import { CarbonManagementConfigurationService } from './configuration/carbon-management-configuration.service';
import { CarbonProjectService } from './projects/carbon-project.service';
import { CarbonExternalVerificationService } from './verification/carbon-external-verification.service';

describe('Carbon management must-fail gates', () => {
  describe('CarbonManagementBoundaryService', () => {
    let boundary: CarbonManagementBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CarbonManagementBoundaryService],
      }).compile();
      boundary = module.get(CarbonManagementBoundaryService);
    });

    it('blocks AI from approving authorization', () => {
      expect(() => {
        boundary.assertAiCannotApproveAuthorization(
          CarbonManagementActorPersona.AI_ASSISTANCE,
          'APPROVE_CARBON_ADMINISTRATIVE_AUTHORIZATION',
        );
      }).toThrow(ForbiddenException);
    });

    it('blocks payment from approving authorization', () => {
      expect(() => {
        boundary.assertPaymentDoesNotApproveAuthorization(
          CarbonManagementActorPersona.PAYMENT_SYSTEM,
        );
      }).toThrow(ForbiddenException);
    });

    it('enforces external verifications before final decision', () => {
      expect(() => {
        boundary.assertExternalVerificationsResolved([
          {
            blocksFinalDecision: true,
            status: CarbonExternalVerificationStatus.PENDING,
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('treats external verification completion as non-approval by default', () => {
      expect(() => {
        boundary.assertExternalVerificationIsNotAutonomousApproval(true);
      }).toThrow(BadRequestException);
    });
  });

  describe('CarbonManagementAuthorityService', () => {
    const functionRecords = { findByCode: jest.fn() };
    const authorityEvaluation = { evaluate: jest.fn() };

    let service: CarbonManagementAuthorityService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CarbonManagementAuthorityService,
          { provide: FunctionAuthorityRecordsService, useValue: functionRecords },
          { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        ],
      }).compile();
      service = module.get(CarbonManagementAuthorityService);
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

  describe('CarbonAdministrativeAuthorizationService', () => {
    const prisma = {
      carbonAdministrativeAuthorizationRecord: { create: jest.fn() },
    };
    const boundary = new CarbonManagementBoundaryService();
    const authority = {
      assertAuthorizationIssuanceAuthority: jest.fn().mockResolvedValue(undefined),
    };
    const externalVerifications = {
      assertFinalDecisionAllowed: jest.fn().mockResolvedValue(undefined),
    };

    let service: CarbonAdministrativeAuthorizationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CarbonAdministrativeAuthorizationService,
          { provide: PrismaService, useValue: prisma },
          { provide: CarbonManagementBoundaryService, useValue: boundary },
          { provide: CarbonManagementAuthorityService, useValue: authority },
          { provide: CarbonExternalVerificationService, useValue: externalVerifications },
        ],
      }).compile();
      service = module.get(CarbonAdministrativeAuthorizationService);
      jest.clearAllMocks();
    });

    it('requires canonical decision and instrument for issuance', async () => {
      await expect(
        service.issueAuthorization({
          carbonProjectId: 'project-1',
          actorPersona: CarbonManagementActorPersona.PROGRAMME_OFFICER,
          actorIdentityType: IdentityType.INDIVIDUAL,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'identity-officer',
          governmentDecisionId: 'decision-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists official instrument reference when authority is active', async () => {
      prisma.carbonAdministrativeAuthorizationRecord.create.mockResolvedValue({
        officialInstrumentId: 'instrument-1',
        governmentDecisionId: 'decision-1',
      });

      const authorization = await service.issueAuthorization({
        carbonProjectId: 'project-1',
        actorPersona: CarbonManagementActorPersona.PROGRAMME_OFFICER,
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
          carbonProjectId: 'project-1',
          actorPersona: CarbonManagementActorPersona.PROGRAMME_OFFICER,
          actorIdentityType: IdentityType.SERVICE,
          issuedByOfficeholderId: 'oh-1',
          issuerIdentityId: 'svc-identity',
          governmentDecisionId: 'decision-1',
          officialInstrumentId: 'instrument-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CarbonExternalVerificationService', () => {
    const prisma = {
      carbonExternalVerificationRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    let service: CarbonExternalVerificationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CarbonExternalVerificationService,
          CarbonManagementBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CarbonExternalVerificationService);
      jest.clearAllMocks();
    });

    it('records attributable external verification evidence', async () => {
      prisma.carbonExternalVerificationRecord.create.mockResolvedValue({
        verifierIdentityId: 'verifier-1',
        externalReference: 'VREF-2026-001',
        isOfficialApproval: false,
      });

      const verification = await service.recordVerification(
        CarbonManagementActorPersona.VERIFICATION_LIAISON,
        {
          carbonProjectId: 'project-1',
          verificationCategory: CarbonExternalVerificationCategory.INDEPENDENT_VERIFICATION,
          status: CarbonExternalVerificationStatus.COMPLETE,
          verifierIdentityId: 'verifier-1',
          externalReference: 'VREF-2026-001',
          recordedBy: CarbonExternalVerificationRecordedBy.VERIFICATION_LIAISON,
          recordedByIdentityId: 'liaison-1',
        },
      );

      expect(verification.verifierIdentityId).toBe('verifier-1');
      expect(verification.isOfficialApproval).toBe(false);
    });

    it('cannot mark external verification as official approval', async () => {
      await expect(
        service.updateVerificationStatus({
          verificationId: 'verification-1',
          reviewerPersona: CarbonManagementActorPersona.EXTERNAL_VERIFIER,
          status: CarbonExternalVerificationStatus.COMPLETE,
          markOfficialApproval: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CarbonManagementAccessService', () => {
    const prisma = {
      carbonDataAccessAudit: { create: jest.fn().mockResolvedValue({}) },
    };

    let access: CarbonManagementAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CarbonManagementAccessService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      access = module.get(CarbonManagementAccessService);
    });

    it('denies commercial confidential evidence without programme officer scope', async () => {
      await expect(
        access.assertConfidentialAccess({
          accessorIdentityId: 'identity-a',
          carbonProjectId: 'project-1',
          classification: CarbonManagementDataClassification.COMMERCIAL_CONFIDENTIAL,
          endpoint: 'test',
          hasProgrammeOfficerScope: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CarbonProjectService', () => {
    const prisma = {
      carbonProjectReference: {
        create: jest.fn().mockResolvedValue({
          organizationId: 'org-1',
          strategicProjectProfileId: 'sp-1',
          doesNotDuplicateOrganization: true,
          doesNotInferApprovalFromStrategicProject: true,
          organization: { id: 'org-1' },
          strategicProjectProfile: { id: 'sp-1' },
        }),
      },
      carbonApplicationReference: {
        create: jest.fn().mockResolvedValue({ caseId: 'case-1', applicationId: 'app-1' }),
      },
    };

    let service: CarbonProjectService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [CarbonProjectService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      service = module.get(CarbonProjectService);
    });

    it('links carbon project to canonical organization and strategic project', async () => {
      const result = await service.registerProject({
        programmeId: 'programme-1',
        organizationId: 'org-1',
        strategicProjectProfileId: 'sp-1',
        projectCategoryCode: 'CONFIGURED-FOREST-RESTORATION',
      });

      expect(result.organizationRecordsDuplicated).toBe(0);
      expect(result.project.strategicProjectProfileId).toBe('sp-1');
    });

    it('uses canonical application and case references', async () => {
      const reference = await service.linkApplicationReference({
        carbonProjectId: 'project-1',
        applicationId: 'app-1',
        caseId: 'case-1',
        serviceCode: 'TEMPLATE-CM-PROJECT-REGISTRATION',
      });

      expect(reference.caseId).toBe('case-1');
      expect(reference.applicationId).toBe('app-1');
    });
  });

  describe('CarbonManagementComplianceReferenceService', () => {
    const prisma = {
      carbonComplianceReference: {
        create: jest.fn().mockResolvedValue({ complianceMatterId: 'cm-1' }),
      },
    };

    let service: CarbonManagementComplianceReferenceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CarbonManagementComplianceReferenceService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CarbonManagementComplianceReferenceService);
    });

    it('integrates with canonical compliance matters', async () => {
      const result = await service.linkComplianceMatter({
        carbonProjectId: 'project-1',
        complianceMatterId: 'cm-1',
      });
      expect(result.complianceMatterId).toBe('cm-1');
    });
  });

  describe('CarbonManagementConfigurationService', () => {
    const prisma = {
      carbonManagementConfiguration: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    let service: CarbonManagementConfigurationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          CarbonManagementConfigurationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(CarbonManagementConfigurationService);
    });

    it('allows another institution to configure taxonomy without core-code changes', async () => {
      prisma.carbonManagementConfiguration.findUnique.mockResolvedValue({
        projectCategoryTaxonomy: [{ code: 'AFFORESTATION', label: 'Afforestation project' }],
        marketMechanicsExtensionModeCode: 'NOT_CONFIGURED',
      });

      const label = await service.resolveProjectCategoryLabel('jurisdiction-b', 'AFFORESTATION');
      expect(label).toBe('Afforestation project');
    });

    it('keeps unknown carbon-market mechanics as configuration extension points', async () => {
      prisma.carbonManagementConfiguration.findUnique.mockResolvedValue(null);

      const mode = await service.getMarketMechanicsExtensionMode('jurisdiction-c');
      expect(mode).toBe('NOT_CONFIGURED');
    });
  });

  describe('Service pack deployment', () => {
    it('deploys carbon-management services through governed service packs', () => {
      const result = validateServicePackManifest(CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE.services.length).toBeGreaterThan(0);
    });
  });

  describe('HeartStone core neutrality', () => {
    it('does not embed ABSEZ-specific carbon policy in platform-core', () => {
      const platformCore = readFileSync(
        join(__dirname, '../platform-core/institution-neutral-enums.util.ts'),
        'utf8',
      );
      expect(platformCore).not.toMatch(/carbon|CARBON/i);
    });
  });
});
