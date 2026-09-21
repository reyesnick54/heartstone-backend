import { BadRequestException } from '@nestjs/common';
import {
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { type ServicePackManifest } from './service-pack.types';
import { ServicePackCompilerService } from './service-pack-compiler.service';
import { ServicePackConflictDetector } from './service-pack-conflict-detector.service';
import { ServicePackDependencyResolver } from './service-pack-dependency-resolver.service';
import { buildServicePackConfigurationFingerprint } from './service-pack-fingerprint.util';
import { ServicePackValidationService } from './service-pack-validation.service';

function createValidManifest(): ServicePackManifest {
  return {
    manifestVersion: '1.0',
    packCode: 'VALID-PACK',
    packLabel: 'Valid Service Pack',
    jurisdictionCode: 'JUR-001',
    institutionCode: 'INST-001',
    services: [
      {
        code: 'SVC-001',
        slug: 'new-service-slug',
        officialName: 'New Service',
        publicName: 'New Service',
        departmentCode: 'DEPT-001',
        serviceFamilyCode: 'FAMILY-001',
        functionAuthorityCodes: ['FAR-001'],
        governingSourceCodes: ['GS-001'],
        redressRoutes: [
          {
            routeCode: 'COMPLAINT',
            label: 'Complaint',
            contactReference: 'complaints@example.gov',
          },
        ],
      },
    ],
  };
}

function createMockPrisma(): PrismaService {
  return {
    jurisdiction: { findUnique: jest.fn().mockResolvedValue({ id: 'jur-id' }) },
    institution: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'inst-id',
        status: StructuralLifecycleStatus.ACTIVE,
      }),
    },
    department: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'dept-id',
        status: StructuralLifecycleStatus.ACTIVE,
      }),
    },
    serviceFamily: { findUnique: jest.fn().mockResolvedValue({ id: 'family-id' }) },
    functionAuthorityRecord: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'far-id',
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: 'inst-id',
      }),
    },
    governingSource: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'gs-id',
        status: GoverningSourceStatus.AUTHENTICATED,
        authenticatedAt: new Date(),
      }),
    },
    integrationDefinition: { findFirst: jest.fn().mockResolvedValue(null) },
    dashboardDefinition: { findFirst: jest.fn().mockResolvedValue(null) },
    externalAuthority: { findUnique: jest.fn().mockResolvedValue(null) },
    formDefinition: { findUnique: jest.fn().mockResolvedValue(null) },
    workflowDefinition: { findUnique: jest.fn().mockResolvedValue(null) },
    governmentService: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
}

describe('ServicePackCompilerService', () => {
  const createCompiler = () => {
    const prisma = createMockPrisma();
    return {
      prisma,
      compiler: new ServicePackCompilerService(
        new ServicePackDependencyResolver(prisma),
        new ServicePackConflictDetector(),
        new ServicePackValidationService(),
      ),
    };
  };

  it('produces deployable result for valid manifest', async () => {
    const { compiler } = createCompiler();
    const result = await compiler.compile(createValidManifest());

    expect(result.readinessSummary.deployable).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.authorityIssues).toHaveLength(0);
    expect(result.serviceCount).toBe(1);
    expect(result.dryRun).toBe(true);
  });

  it('rejects unsupported manifest version', async () => {
    const { compiler } = createCompiler();
    const manifest = { ...createValidManifest(), manifestVersion: '99.0' };

    await expect(compiler.compile(manifest)).rejects.toThrow(BadRequestException);
  });

  it('rejects empty services array', async () => {
    const { compiler } = createCompiler();
    const manifest = { ...createValidManifest(), services: [] };

    await expect(compiler.compile(manifest)).rejects.toThrow(BadRequestException);
  });

  it('produces deterministic configuration fingerprint', () => {
    const manifest = createValidManifest();
    const fp1 = buildServicePackConfigurationFingerprint(manifest);
    const fp2 = buildServicePackConfigurationFingerprint(manifest);

    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('includes dependency resolution in compilation output', async () => {
    const { compiler } = createCompiler();
    const result = await compiler.compile(createValidManifest());

    expect(result.dependencies.length).toBeGreaterThan(0);
    expect(result.dependencies.some((d) => d.kind === 'Jurisdiction')).toBe(true);
    expect(result.dependencies.some((d) => d.kind === 'Institution')).toBe(true);
    expect(result.dependencies.some((d) => d.kind === 'Department')).toBe(true);
  });
});
