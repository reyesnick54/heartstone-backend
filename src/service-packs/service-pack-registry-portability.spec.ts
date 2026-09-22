import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ServicePackDeploymentStatus,
  ServicePackExportRestriction,
  ServicePackImportStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { type ActorContext } from '../identity/auth/context/actor-context.types';
import { ManifestValidatorService } from './common/manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from './common/service-packs-boundary.service';
import { REPRESENTATIVE_SERVICE_PACK_MANIFEST } from './fixtures/representative-service-pack-manifest.fixture';
import { ServicePackJurisdictionBindingService } from './jurisdiction/service-pack-jurisdiction-binding.service';
import {
  assertPortableExportContainsNoForbiddenData,
  computePortablePackageFingerprint,
  sanitizePortableExportPayload,
} from './portability/portable-export-sanitizer.util';
import { type PortableServicePackExportPackage } from './portability/portable-package.types';
import { ServicePackExportService } from './portability/service-pack-export.service';
import { ServicePackImportService } from './portability/service-pack-import.service';
import { ServicePackPortabilityAccessService } from './portability/service-pack-portability-access.service';
import { ServicePackInventoryService } from './registry/service-pack-inventory.service';
import { ServicePackUpgradePlanService } from './registry/service-pack-upgrade-plan.service';
import { PORTABLE_SECRET_REFERENCE_PREFIX } from './service-packs.constants';
import { ServicePackTemplateCloneService } from './template/service-pack-template-clone.service';

describe('Service pack registry and portability', () => {
  const actorWithoutScope = {
    identityId: 'identity-outsider',
    hasInstitutionalRelationships: false,
    institutionContexts: [],
  } as unknown as ActorContext;

  const actorWithScope = {
    identityId: 'identity-insider',
    hasInstitutionalRelationships: true,
    institutionContexts: [{ institutionId: 'inst-1', departmentIds: [] }],
  } as unknown as ActorContext;

  describe('portable export sanitizer', () => {
    it('exported pack contains no secrets and represents secrets by references only', () => {
      const manifest = {
        ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
        integrations: [
          {
            code: 'payment-gateway',
            name: 'Payment Gateway',
            apiKey: 'super-secret-value',
          },
        ],
      };

      const sanitized = sanitizePortableExportPayload(manifest) as Record<string, unknown>;
      const integrations = sanitized.integrations as Record<string, unknown>[];
      expect(integrations[0]?.apiKey).toMatch(new RegExp(`^${PORTABLE_SECRET_REFERENCE_PREFIX}`));
      expect(JSON.stringify(sanitized)).not.toContain('super-secret-value');
    });

    it('exported pack contains no citizen or case data sections', () => {
      const payload = sanitizePortableExportPayload({
        ...REPRESENTATIVE_SERVICE_PACK_MANIFEST,
        cases: [{ id: 'case-1' }],
        citizens: [{ id: 'citizen-1' }],
      });

      expect(JSON.stringify(payload)).not.toContain('case-1');
      expect(JSON.stringify(payload)).not.toContain('citizen-1');
      assertPortableExportContainsNoForbiddenData(payload);
    });

    it('package fingerprint remains deterministic', () => {
      const payload = { alpha: 1, nested: { beta: 2 } };
      const first = computePortablePackageFingerprint(payload);
      const second = computePortablePackageFingerprint({ nested: { beta: 2 }, alpha: 1 });
      expect(first).toBe(second);
    });
  });

  describe('ServicePackExportService', () => {
    let exportService: ServicePackExportService;
    const prismaMock = {
      servicePackVersion: {
        findFirst: jest.fn(),
      },
    };

    beforeEach(async () => {
      prismaMock.servicePackVersion.findFirst.mockReset();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ServicePackExportService,
          ServicePackPortabilityAccessService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

      exportService = module.get(ServicePackExportService);
    });

    it('unauthorized user cannot export restricted service pack', async () => {
      prismaMock.servicePackVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        servicePackId: 'pack-1',
        manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST,
        dependencies: [],
        servicePack: {
          institutionId: 'inst-1',
          jurisdictionId: 'jur-1',
          exportRestriction: ServicePackExportRestriction.INSTITUTION_RESTRICTED,
          responsibleOwnerIdentityId: 'owner-1',
        },
      });

      await expect(
        exportService.exportVersion({
          servicePackId: 'pack-1',
          servicePackVersionId: 'version-1',
          exportPurpose: 'AUDIT',
          actor: actorWithoutScope,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('exports restricted pack for institution-scoped actor', async () => {
      prismaMock.servicePackVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        servicePackId: 'pack-1',
        manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST,
        dependencies: [],
        servicePack: {
          institutionId: 'inst-1',
          jurisdictionId: 'jur-1',
          exportRestriction: ServicePackExportRestriction.INSTITUTION_RESTRICTED,
          responsibleOwnerIdentityId: 'owner-1',
        },
      });

      const exported = await exportService.exportVersion({
        servicePackId: 'pack-1',
        servicePackVersionId: 'version-1',
        exportPurpose: 'BACKUP',
        actor: actorWithScope,
      });

      expect(exported.metadata.containsSecrets).toBe(false);
      expect(exported.metadata.containsOperationalData).toBe(false);
      expect(exported.metadata.packageFingerprint).toHaveLength(64);
    });
  });

  describe('ServicePackImportService', () => {
    let importService: ServicePackImportService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ServicePackImportService,
          ServicePacksBoundaryService,
          ManifestValidatorService,
          ServicePackJurisdictionBindingService,
          {
            provide: PrismaService,
            useValue: {
              $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
                callback({
                  servicePack: {
                    create: jest.fn().mockResolvedValue({ id: 'pack-imported' }),
                  },
                  servicePackImport: {
                    create: jest.fn().mockResolvedValue({ id: 'import-1' }),
                    update: jest.fn(),
                  },
                  servicePackVersion: {
                    create: jest.fn().mockResolvedValue({
                      id: 'version-imported',
                      manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT_IMPORTED,
                      status: ServicePackVersionStatus.COMPILED,
                    }),
                  },
                  servicePackJurisdictionBinding: {
                    upsert: jest.fn(),
                  },
                }),
              ),
            },
          },
        ],
      }).compile();

      importService = module.get(ServicePackImportService);
    });

    it('imported pack is not automatically accepted or active', async () => {
      const portablePackage: PortableServicePackExportPackage = {
        exportVersion: 'heartstone.service-pack.export/v1',
        metadata: {
          exportPurpose: 'CONTROLLED_PORTABILITY',
          exportedAt: new Date().toISOString(),
          sourceServicePackId: 'pack-src',
          sourceServicePackVersionId: 'version-src',
          sourceJurisdictionId: 'jur-src',
          sourceInstitutionId: 'inst-src',
          packageFingerprint: 'abc',
          manifestChecksum: 'def',
          containsOperationalData: false,
          containsSecrets: false,
        },
        manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST,
        dependencySummaries: [],
      };

      const result = await importService.importPortablePackage(
        {
          targetInstitutionId: 'inst-target',
          targetJurisdictionId: 'jur-target',
          package: portablePackage,
        },
        'identity-importer',
      );

      importService.verifyImportedPackageNotOperational(result);
      expect(result.importStatus).toBe(ServicePackImportStatus.DRAFT_IMPORTED);
      expect(result.manifestValidationStatus).toBe(
        ServicePackManifestValidationStatus.DRAFT_IMPORTED,
      );
      expect(result.versionStatus).toBe(ServicePackVersionStatus.COMPILED);
    });
  });

  describe('ServicePackTemplateCloneService', () => {
    it('cross-jurisdiction clone removes legal acceptance and requires authority rebind', async () => {
      const prisma = {
        servicePackVersion: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'version-src',
            servicePackId: 'pack-src',
            manifestVersion: 'heartstone.service-pack/v1',
            status: ServicePackVersionStatus.ACCEPTED,
            manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST,
            servicePack: { description: 'Source pack' },
          }),
        },
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            servicePack: {
              create: jest.fn().mockResolvedValue({ id: 'pack-clone' }),
            },
            servicePackImport: {
              create: jest.fn().mockResolvedValue({ id: 'import-clone' }),
              update: jest.fn(),
            },
            servicePackVersion: {
              create: jest.fn().mockResolvedValue({
                id: 'version-clone',
                manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT_IMPORTED,
                status: ServicePackVersionStatus.COMPILED,
              }),
            },
            servicePackJurisdictionBinding: {
              upsert: jest.fn(),
            },
          }),
        ),
      };

      const service = new ServicePackTemplateCloneService(
        prisma as never,
        new ServicePackJurisdictionBindingService(prisma as never),
      );

      const result = await service.cloneAsTemplate({
        sourceServicePackId: 'pack-src',
        sourceVersionId: 'version-src',
        targetInstitutionId: 'inst-b',
        targetJurisdictionId: 'jur-b',
        targetPackCode: 'immigration-template-bb',
        targetPackName: 'Immigration Template (BB)',
      });

      expect(result.versionStatus).toBe(ServicePackVersionStatus.COMPILED);
      expect(result.manifestValidationStatus).toBe(
        ServicePackManifestValidationStatus.DRAFT_IMPORTED,
      );
      expect(result.authorityMappingsRevalidationRequired).toBe(true);
    });
  });

  describe('ServicePackInventoryService', () => {
    it('registry accurately identifies active and superseded versions', () => {
      const inventory = new ServicePackInventoryService({} as PrismaService);
      const entry = inventory.mapPackToRegistryEntry({
        id: 'pack-1',
        code: 'pack',
        name: 'Pack',
        description: null,
        jurisdictionId: 'jur-1',
        institutionId: 'inst-1',
        departmentCode: 'DEPT',
        responsibleOwnerIdentityId: 'owner-1',
        exportRestriction: ServicePackExportRestriction.INSTITUTION_RESTRICTED,
        templateSourceServicePackId: null,
        versions: [
          {
            id: 'version-old',
            version: '1.0.0',
            status: ServicePackVersionStatus.ACCEPTED,
            manifestValidationStatus: ServicePackManifestValidationStatus.VALIDATED,
            compilationFingerprint: 'fp-old',
            manifestChecksum: 'mc-old',
            acceptedAt: new Date('2026-01-01T00:00:00.000Z'),
            compiledAt: new Date('2026-01-01T00:00:00.000Z'),
            components: [],
            dependencies: [],
            validationResults: [],
            deployments: [
              {
                id: 'deployment-old',
                status: ServicePackDeploymentStatus.SUPERSEDED,
                deploymentReference: 'env-a',
                deployedAt: new Date('2026-01-02T00:00:00.000Z'),
              },
            ],
          },
          {
            id: 'version-new',
            version: '2.0.0',
            status: ServicePackVersionStatus.ACCEPTED,
            manifestValidationStatus: ServicePackManifestValidationStatus.VALIDATED,
            compilationFingerprint: 'fp-new',
            manifestChecksum: 'mc-new',
            acceptedAt: new Date('2026-02-01T00:00:00.000Z'),
            compiledAt: new Date('2026-02-01T00:00:00.000Z'),
            components: [],
            dependencies: [],
            validationResults: [],
            deployments: [
              {
                id: 'deployment-new',
                status: ServicePackDeploymentStatus.ACTIVE,
                deploymentReference: 'env-a',
                deployedAt: new Date('2026-02-02T00:00:00.000Z'),
              },
            ],
          },
        ],
      } as never);

      expect(entry.activeVersionId).toBe('version-new');
      expect(entry.supersededVersionIds).toContain('version-old');
      expect(entry.deployedEnvironment).toBe('env-a');
    });
  });

  describe('ServicePackUpgradePlanService', () => {
    it('upgrade dry-run does not mutate configuration', async () => {
      const prisma = {
        servicePackVersion: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'version-target',
            servicePackId: 'pack-1',
            components: [],
            deployments: [],
          }),
        },
        servicePackDeployment: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        case: {
          findMany: jest.fn(),
        },
      };

      const service = new ServicePackUpgradePlanService(prisma as never);
      const plan = await service.buildUpgradePlan({
        servicePackId: 'pack-1',
        targetVersionId: 'version-target',
      });

      expect(plan.dryRun).toBe(true);
      expect(prisma.servicePackVersion.findFirst).toHaveBeenCalled();
      expect(prisma.case.findMany).not.toHaveBeenCalled();
    });

    it('active historical applications remain pinned to old configuration', async () => {
      const prisma = {
        servicePackVersion: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'version-target',
            servicePackId: 'pack-1',
            components: [],
            deployments: [],
          }),
        },
        servicePackDeployment: {
          findFirst: jest.fn().mockResolvedValue({
            bindings: [
              {
                domain: 'SERVICE_CATALOG',
                domainEntityId: 'gsv-old',
              },
            ],
          }),
        },
        case: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'case-1',
              governmentServiceVersionId: 'gsv-old',
              configurationFingerprint: 'old-fingerprint',
            },
          ]),
        },
      };

      const service = new ServicePackUpgradePlanService(prisma as never);
      const plan = await service.buildUpgradePlan({
        servicePackId: 'pack-1',
        targetVersionId: 'version-target',
      });

      expect(plan.activeCasesPinnedToOlderVersions).toHaveLength(1);
      expect(plan.activeCasesPinnedToOlderVersions[0]?.governmentServiceVersionId).toBe('gsv-old');
    });
  });
});
