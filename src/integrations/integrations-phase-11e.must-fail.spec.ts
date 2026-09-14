import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthoritativeSourceStatus,
  CredentialRotationStatus,
  DataExchangeFieldClassification,
  IntegrationAcceptanceState,
  IntegrationApprovalStatus,
  IntegrationApprovalType,
  IntegrationDefinitionStatus,
  IntegrationVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { IntegrationsBoundaryService } from './common/integrations-boundary.service';
import { IntegrationsValidationService } from './common/integrations-validation.service';
import { DataExchangeContractsService } from './registry/data-exchange-contracts.service';
import { IntegrationAcceptanceService } from './registry/integration-acceptance.service';
import { IntegrationDefinitionsService } from './registry/integration-definitions.service';
import { IntegrationExecutionService } from './registry/integration-execution.service';
import { IntegrationVersionsService } from './registry/integration-versions.service';

describe('Phase 11E must-fail gates', () => {
  describe('IntegrationsBoundaryService', () => {
    let boundary: IntegrationsBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [IntegrationsBoundaryService],
      }).compile();
      boundary = module.get(IntegrationsBoundaryService);
    });

    it('rejects new integration defaulting to AUTHORITATIVE', () => {
      expect(() => {
        boundary.assertNewIntegrationDefaultsNonAuthoritative(AuthoritativeSourceStatus.AUTHORITATIVE);
      }).toThrow(BadRequestException);
    });

    it('rejects technical connection setting authoritative fields', () => {
      expect(() => {
        boundary.rejectTechnicalConnectionCannotSetAuthoritative({ sourceStatus: 'AUTHORITATIVE' });
      }).toThrow(BadRequestException);
    });

    it('rejects technical admin designating government source authoritative by role alone', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotDesignateAuthoritativeByRole(
          'TECHNICAL_ADMIN',
          AuthoritativeSourceStatus.AUTHORITATIVE,
        );
      }).toThrow(ForbiddenException);
    });

    it('preserves field-specific authority when parent designation is not authoritative', () => {
      expect(() => {
        boundary.assertFieldAuthorityPreserved(
          AuthoritativeSourceStatus.REFERENCE_ONLY,
          AuthoritativeSourceStatus.AUTHORITATIVE,
          'beneficialOwnership',
        );
      }).toThrow(BadRequestException);
    });

    it('blocks prohibited fields from being added as permitted', () => {
      expect(() => {
        boundary.assertProhibitedFieldNotInPermittedList('nationalIdNumber', ['nationalIdNumber']);
      }).toThrow(BadRequestException);
    });

    it('does not return secret values in credential responses', () => {
      const response = boundary.sanitizeCredentialReference({
        id: 'cred-1',
        integrationVersionId: 'ver-1',
        credentialType: 'API_KEY',
        secretReference: 'vault://secret/abc123',
        certificateReference: 'vault://cert/xyz',
        serviceIdentity: 'svc-1',
        expiration: new Date('2020-01-01'),
        rotationStatus: CredentialRotationStatus.EXPIRED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(response).not.toHaveProperty('secretReference');
      expect(response).not.toHaveProperty('certificateReference');
      expect(response.secretReferenceConfigured).toBe(true);
      expect(response.certificateReferenceConfigured).toBe(true);
      expect(response.isExpired).toBe(true);
    });

    it('blocks execution for suspended integration', () => {
      expect(() => {
        boundary.assertExecutionAvailable(
          IntegrationDefinitionStatus.SUSPENDED,
          IntegrationVersionStatus.ACTIVE,
          IntegrationAcceptanceState.ACTIVE,
        );
      }).toThrow(BadRequestException);
    });

    it('blocks in-place modification of accepted versions', () => {
      expect(() => {
        boundary.assertAcceptedVersionImmutable(new Date(), { version: '2.0.0' });
      }).toThrow(BadRequestException);
    });

    it('requires acceptance gates before ACTIVE', () => {
      expect(() => {
        boundary.assertActiveRequiresAcceptanceGates([IntegrationAcceptanceState.CONFIGURED]);
      }).toThrow(BadRequestException);
    });

    it('rejects conflating system ownership with institutional decision authority', () => {
      expect(() => {
        boundary.assertSystemOwnershipNotInstitutionalAuthority('inst-1', 'inst-1');
      }).toThrow(BadRequestException);
    });
  });

  describe('IntegrationDefinitionsService', () => {
    const prisma = {
      institution: { findUnique: jest.fn().mockResolvedValue({ id: 'inst-1' }) },
      integrationDefinition: {
        create: jest.fn().mockResolvedValue({
          id: 'def-1',
          status: IntegrationDefinitionStatus.DRAFT,
        }),
      },
    };

    let service: IntegrationDefinitionsService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IntegrationDefinitionsService,
          IntegrationsBoundaryService,
          IntegrationsValidationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(IntegrationDefinitionsService);
      jest.clearAllMocks();
      prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
    });

    it('creates new integration as DRAFT non-authoritative registry entry', async () => {
      prisma.integrationDefinition.create.mockResolvedValue({
        id: 'def-1',
        status: IntegrationDefinitionStatus.DRAFT,
      });

      const result = await service.create({
        integrationCode: 'CORP-REG-01',
        officialName: 'Corporate Registry Lookup',
        institutionalOwnerId: 'inst-1',
        systemOwner: 'platform-integration-team',
        provider: 'Registrar General',
        dependencyCategory: 'GOVERNMENT_REGISTRY',
        businessPurpose: 'Verify company registration numbers',
      });

      expect(result.status).toBe(IntegrationDefinitionStatus.DRAFT);
      expect(prisma.integrationDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: IntegrationDefinitionStatus.DRAFT }) as object,
        }),
      );
    });
  });

  describe('DataExchangeContractsService', () => {
    const prisma = {
      integrationVersion: { findUnique: jest.fn().mockResolvedValue({ id: 'ver-1' }) },
      dataExchangeContract: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'contract-1',
          fields: [
            {
              fieldName: 'rawBiometricData',
              classification: DataExchangeFieldClassification.PROHIBITED,
            },
          ],
        }),
        create: jest.fn(),
      },
      dataExchangeField: { create: jest.fn() },
    };

    let service: DataExchangeContractsService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DataExchangeContractsService,
          IntegrationsBoundaryService,
          IntegrationsValidationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(DataExchangeContractsService);
    });

    it('blocks adding prohibited field as permitted', async () => {
      await expect(
        service.addField('contract-1', {
          fieldName: 'rawBiometricData',
          classification: DataExchangeFieldClassification.PERMITTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('IntegrationVersionsService supersession', () => {
    const integrationVersion = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const prisma: {
      integrationDefinition: { findUnique: jest.Mock };
      integrationVersion: typeof integrationVersion;
      integrationAcceptanceRecord: { create: jest.Mock };
      $transaction: jest.Mock;
    } = {
      integrationDefinition: { findUnique: jest.fn().mockResolvedValue({ id: 'def-1' }) },
      integrationVersion,
      integrationAcceptanceRecord: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    );

    let service: IntegrationVersionsService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IntegrationVersionsService,
          IntegrationsBoundaryService,
          IntegrationsValidationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(IntegrationVersionsService);
    });

    it('retains superseded versions instead of deleting them', async () => {
      integrationVersion.findUnique
        .mockResolvedValueOnce({
          id: 'v1',
          integrationDefinitionId: 'def-1',
          status: IntegrationVersionStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          id: 'v2',
          integrationDefinitionId: 'def-1',
          status: IntegrationVersionStatus.DRAFT,
        });

      integrationVersion.update.mockResolvedValue({
        id: 'v1',
        status: IntegrationVersionStatus.SUPERSEDED,
        supersededByVersionId: 'v2',
      });

      const result = await service.supersede('v1', 'v2');

      expect(result.status).toBe(IntegrationVersionStatus.SUPERSEDED);
      expect(result.supersededByVersionId).toBe('v2');
    });
  });

  describe('IntegrationAcceptanceService ACTIVE gate', () => {
    const integrationVersion = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'ver-1',
        currentAcceptanceState: IntegrationAcceptanceState.TESTED,
      }),
      update: jest.fn(),
    };
    const prisma: {
      integrationVersion: typeof integrationVersion;
      integrationAcceptanceRecord: { findMany: jest.Mock; create: jest.Mock };
      integrationApproval: { findMany: jest.Mock };
      $transaction: jest.Mock;
    } = {
      integrationVersion,
      integrationAcceptanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { acceptanceState: IntegrationAcceptanceState.CONFIGURED },
          { acceptanceState: IntegrationAcceptanceState.TESTED },
        ]),
        create: jest.fn(),
      },
      integrationApproval: {
        findMany: jest.fn().mockResolvedValue([
          { approvalType: IntegrationApprovalType.SECURITY, status: IntegrationApprovalStatus.APPROVED },
        ]),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    );

    let service: IntegrationAcceptanceService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IntegrationAcceptanceService,
          IntegrationsBoundaryService,
          IntegrationVersionsService,
          IntegrationsValidationService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(IntegrationAcceptanceService);
    });

    it('cannot become ACTIVE without configured acceptance gates and approvals', async () => {
      await expect(
        service.recordAcceptanceState('ver-1', {
          acceptanceState: IntegrationAcceptanceState.ACTIVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('IntegrationExecutionService', () => {
    const definitionsService = {
      findOne: jest.fn().mockResolvedValue({ status: IntegrationDefinitionStatus.ACTIVE }),
    };
    const versionsService = {
      findOne: jest.fn().mockResolvedValue({
        integrationDefinitionId: 'def-1',
        status: IntegrationVersionStatus.SUSPENDED,
        currentAcceptanceState: IntegrationAcceptanceState.SUSPENDED,
      }),
    };

    let service: IntegrationExecutionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          IntegrationExecutionService,
          IntegrationsBoundaryService,
          { provide: IntegrationDefinitionsService, useValue: definitionsService },
          { provide: IntegrationVersionsService, useValue: versionsService },
        ],
      }).compile();

      service = module.get(IntegrationExecutionService);
    });

    it('makes suspended integration unavailable to execution', async () => {
      await expect(service.assertAvailableForExecution('ver-1')).rejects.toThrow(BadRequestException);
    });
  });
});
