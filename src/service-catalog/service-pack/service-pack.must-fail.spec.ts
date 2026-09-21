import {
  FormConditionalAction,
  FormConditionalLogic,
  FormConditionalOperator,
  FormFieldType,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  IntegrationDefinitionStatus,
  StructuralLifecycleStatus,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import {
  SERVICE_PACK_COMPILATION_CHECK_CODES,
  SERVICE_PACK_COMPILATION_DISCLAIMER,
} from './service-pack.constants';
import { type ServicePackManifest } from './service-pack.types';
import { ServicePackCompilerService } from './service-pack-compiler.service';
import { ServicePackConflictDetector } from './service-pack-conflict-detector.service';
import { ServicePackDependencyResolver } from './service-pack-dependency-resolver.service';
import {
  buildAuthoritativeConfigurationFingerprint,
  buildServicePackConfigurationFingerprint,
} from './service-pack-fingerprint.util';
import { ServicePackValidationService } from './service-pack-validation.service';

const INSTITUTION_ID = 'inst-001';
const JURISDICTION_ID = 'jur-001';
const DEPARTMENT_ID = 'dept-001';
const FUNCTION_ID = 'far-001';
const GOVERNING_SOURCE_ID = 'gs-001';
const FAMILY_ID = 'family-001';

function buildBaseService(
  overrides: Partial<ServicePackManifest['services'][number]> = {},
): ServicePackManifest['services'][number] {
  return {
    code: 'TEST-SVC-001',
    slug: 'test-service-001',
    officialName: 'Test Service',
    publicName: 'Test Service',
    departmentCode: 'TEST-DEPT',
    serviceFamilyCode: 'TEST-FAMILY',
    functionAuthorityCodes: ['TEST-FAR'],
    governingSourceCodes: ['TEST-GS'],
    ...overrides,
  };
}

function buildBaseManifest(overrides: Partial<ServicePackManifest> = {}): ServicePackManifest {
  return {
    manifestVersion: '1.0',
    packCode: 'TEST-PACK',
    packLabel: 'Test Service Pack',
    jurisdictionCode: 'TEST-JUR',
    institutionCode: 'TEST-INST',
    services: [buildBaseService()],
    ...overrides,
  };
}

function createMockPrisma(overrides: Record<string, unknown> = {}): PrismaService {
  const defaults = {
    jurisdiction: {
      findUnique: jest.fn().mockResolvedValue({ id: JURISDICTION_ID }),
    },
    institution: {
      findFirst: jest.fn().mockResolvedValue({
        id: INSTITUTION_ID,
        status: StructuralLifecycleStatus.ACTIVE,
      }),
    },
    department: {
      findFirst: jest.fn().mockResolvedValue({
        id: DEPARTMENT_ID,
        status: StructuralLifecycleStatus.ACTIVE,
      }),
    },
    serviceFamily: {
      findUnique: jest.fn().mockResolvedValue({ id: FAMILY_ID }),
    },
    functionAuthorityRecord: {
      findUnique: jest.fn().mockResolvedValue({
        id: FUNCTION_ID,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: INSTITUTION_ID,
      }),
    },
    governingSource: {
      findUnique: jest.fn().mockResolvedValue({
        id: GOVERNING_SOURCE_ID,
        status: GoverningSourceStatus.AUTHENTICATED,
        authenticatedAt: new Date('2025-01-01'),
      }),
    },
    integrationDefinition: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    dashboardDefinition: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    externalAuthority: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    formDefinition: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    workflowDefinition: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    governmentService: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return { ...defaults, ...overrides } as unknown as PrismaService;
}

function createCompiler(prisma: PrismaService): ServicePackCompilerService {
  const dependencyResolver = new ServicePackDependencyResolver(prisma);
  const conflictDetector = new ServicePackConflictDetector();
  const validationService = new ServicePackValidationService();
  return new ServicePackCompilerService(dependencyResolver, conflictDetector, validationService);
}

describe('ServicePackCompiler must-fail invariants', () => {
  it('exposes dry-run compilation disclaimer', () => {
    expect(SERVICE_PACK_COMPILATION_DISCLAIMER).toContain('dry-run');
    expect(SERVICE_PACK_COMPILATION_DISCLAIMER).toContain('does not mutate');
  });

  it('1. fails compilation when department is missing', async () => {
    const prisma = createMockPrisma({
      department: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(buildBaseManifest());

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.DEPARTMENT_OWNERSHIP,
      ),
    ).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  it('2. fails compilation when authority function is missing', async () => {
    const prisma = createMockPrisma({
      functionAuthorityRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(buildBaseManifest());

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.AUTHORITY_MAPPING_EXISTENCE,
      ),
    ).toBe(true);
    expect(result.authorityIssues.length).toBeGreaterThan(0);
  });

  it('3. fails compilation when governing source is unauthenticated', async () => {
    const prisma = createMockPrisma({
      governingSource: {
        findUnique: jest.fn().mockResolvedValue({
          id: GOVERNING_SOURCE_ID,
          status: GoverningSourceStatus.DRAFT,
          authenticatedAt: null,
        }),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(buildBaseManifest());

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.GOVERNING_SOURCE_AUTHENTICATION,
      ),
    ).toBe(true);
    expect(result.authorityIssues.some((a) => a.governingSourceCode === 'TEST-GS')).toBe(true);
  });

  it('4. fails compilation for invalid workflow (dead stage)', async () => {
    const manifest = buildBaseManifest({
      workflows: [
        {
          code: 'TEST-WF',
          version: '1.0',
          stages: [{ stageKey: 'stage-1', label: 'Stage 1', displayOrder: 1 }],
          steps: [
            {
              stepKey: 'entry',
              label: 'Entry',
              stepType: WorkflowStepType.INTAKE,
              displayOrder: 1,
            },
            {
              stepKey: 'dead-step',
              label: 'Dead Step',
              stepType: WorkflowStepType.SUBSTANTIVE_REVIEW,
              displayOrder: 2,
            },
          ],
          transitions: [{ transitionKey: 't1', fromStepKey: 'entry', toStepKey: 'nonexistent' }],
        },
      ],
    });

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) =>
          e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.MISSING_TRANSITIONS ||
          e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.DEAD_WORKFLOW_STAGES ||
          e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.WORKFLOW_GRAPH_VALIDITY,
      ),
    ).toBe(true);
  });

  it('5. fails compilation for unresolved external dependency', async () => {
    const manifest = buildBaseManifest({
      services: [buildBaseService({ externalAuthorityCodes: ['MISSING-EXT-AUTH'] })],
    });

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.EXTERNAL_AUTHORITY_DEPENDENCIES,
      ),
    ).toBe(true);
    expect(result.unresolvedDependencies.some((d) => d.ref === 'MISSING-EXT-AUTH')).toBe(true);
  });

  it('6. fails compilation for duplicate service slug', async () => {
    const prisma = createMockPrisma({
      governmentService: {
        findMany: jest.fn().mockResolvedValue([{ code: 'EXISTING', slug: 'test-service-001' }]),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(buildBaseManifest());

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.SERVICE_SLUG_COLLISION,
      ),
    ).toBe(true);
    expect(result.configurationConflicts.length).toBeGreaterThan(0);
  });

  it('7. fails compilation for invalid fee configuration', async () => {
    const manifest = buildBaseManifest({
      services: [
        buildBaseService({
          fees: [{ code: 'APP-FEE', label: 'Application Fee', amountCents: -100 }],
        }),
      ],
    });

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.FEE_DEFINITION_CONFLICTS,
      ),
    ).toBe(true);
  });

  it('8. fails compilation for invalid form condition', async () => {
    const manifest = buildBaseManifest({
      forms: [
        {
          code: 'TEST-FORM',
          version: 1,
          title: { default: 'Test Form' },
          sections: [
            {
              sectionKey: 'main',
              title: { default: 'Main' },
              displayOrder: 1,
              fields: [
                {
                  fieldKey: 'dependent_field',
                  label: { default: 'Dependent' },
                  fieldType: FormFieldType.TEXT,
                  displayOrder: 1,
                  conditionalRules: [
                    {
                      action: FormConditionalAction.SHOW,
                      logic: FormConditionalLogic.AND,
                      conditions: [
                        {
                          fieldKey: 'unknown_field',
                          operator: FormConditionalOperator.EQUALS,
                          value: 'yes',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.FORM_FIELD_VALIDITY,
      ),
    ).toBe(true);
  });

  it('9. fails compilation for broken redress route', async () => {
    const manifest = buildBaseManifest({
      services: [
        buildBaseService({ redressRoutes: [{ routeCode: 'COMPLAINT', label: 'Complaint Route' }] }),
      ],
    });

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.REDRESS_ROUTE_COMPLETENESS,
      ),
    ).toBe(true);
  });

  it('10. fails compilation for unauthorized cross-institution reference', async () => {
    const manifest = buildBaseManifest({
      services: [buildBaseService({ integrationCodes: ['FOREIGN-INTEGRATION'] })],
    });

    const prisma = createMockPrisma({
      integrationDefinition: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) =>
          e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.CROSS_INSTITUTION_REFERENCE ||
          e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.INTEGRATION_DEPENDENCY_AVAILABILITY,
      ),
    ).toBe(true);
  });

  it('11. fails compilation when manifest attempts to bypass service activation', async () => {
    const manifest = {
      ...buildBaseManifest(),
      bypassActivation: true,
    } as ServicePackManifest & { bypassActivation: boolean };

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.ACTIVATION_BYPASS_FORBIDDEN,
      ),
    ).toBe(true);
    expect(result.readinessSummary.safeHaltReason).toContain('critical');
  });

  it('12. fails compilation when manifest attempts to create authority', async () => {
    const manifest = {
      ...buildBaseManifest(),
      createAuthority: { code: 'NEW-FAR', name: 'Unauthorized' },
    } as ServicePackManifest & { createAuthority: Record<string, string> };

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.AUTHORITY_CREATION_FORBIDDEN,
      ),
    ).toBe(true);
  });

  it('13. configuration fingerprint changes when authoritative config changes', () => {
    const manifest = buildBaseManifest();
    const fingerprint1 = buildServicePackConfigurationFingerprint(manifest);

    const modifiedManifest = buildBaseManifest({
      services: [buildBaseService({ publicName: 'Modified Service Name' })],
    });
    const fingerprint2 = buildServicePackConfigurationFingerprint(modifiedManifest);

    expect(fingerprint1).not.toBe(fingerprint2);

    const authoritativeConfig = { institutionCode: 'TEST-INST', departmentCount: 1 };
    const authFingerprint1 = buildAuthoritativeConfigurationFingerprint(authoritativeConfig);
    const authFingerprint2 = buildAuthoritativeConfigurationFingerprint({
      ...authoritativeConfig,
      departmentCount: 2,
    });

    expect(authFingerprint1).not.toBe(authFingerprint2);
  });

  it('returns immutable compilation result that does not mutate production', async () => {
    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(buildBaseManifest());

    expect(Object.isFrozen(result)).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.configurationFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.serviceCount).toBe(1);
  });

  it('safe-halts on critical authority issues even with zero generic errors', async () => {
    const manifest = buildBaseManifest({
      services: [buildBaseService({ functionAuthorityCodes: [] })],
    });

    const compiler = createCompiler(createMockPrisma());
    const result = await compiler.compile(manifest);

    expect(result.readinessSummary.deployable).toBe(false);
    expect(result.readinessSummary.safeHaltReason).toBeDefined();
  });

  it('detects invalid consequential action mapping in workflow', async () => {
    const manifest = buildBaseManifest({
      workflows: [
        {
          code: 'TEST-WF',
          version: '1.0',
          stages: [],
          steps: [
            {
              stepKey: 'decide',
              label: 'Decision',
              stepType: WorkflowStepType.DECISION_GATE,
              consequenceLevel: WorkflowStepConsequenceLevel.CONSEQUENTIAL,
              functionAuthorityCode: 'MISSING-FAR',
              displayOrder: 1,
            },
          ],
          transitions: [],
        },
      ],
    });

    const prisma = createMockPrisma({
      functionAuthorityRecord: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { code: string } }) => {
          if (where.code === 'MISSING-FAR') {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            id: FUNCTION_ID,
            lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
            institutionId: INSTITUTION_ID,
          });
        }),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(manifest);

    expect(
      result.errors.some(
        (e) => e.code === SERVICE_PACK_COMPILATION_CHECK_CODES.INVALID_CONSEQUENTIAL_ACTION_MAPPING,
      ),
    ).toBe(true);
  });

  it('resolves integration dependency when available', async () => {
    const manifest = buildBaseManifest({
      services: [buildBaseService({ integrationCodes: ['PAYMENT-GW'] })],
    });

    const prisma = createMockPrisma({
      integrationDefinition: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'int-001',
          status: IntegrationDefinitionStatus.ACTIVE,
        }),
      },
    });
    const compiler = createCompiler(prisma);
    const result = await compiler.compile(manifest);

    expect(result.integrationCount).toBe(1);
    expect(result.dependencies.some((d) => d.ref === 'PAYMENT-GW' && d.resolved)).toBe(true);
  });
});
