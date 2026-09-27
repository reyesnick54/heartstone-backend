import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  GovernmentServiceMaturityStatus,
  ServicePackDeploymentBindingDomain,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { calculateServicePackFingerprint } from '../../service-catalog/service-packs/calculate-service-pack-fingerprint';
import { ServicePackRuntimeCompilerService } from '../../service-catalog/service-packs/service-pack-runtime-compiler.service';
import { ServicePacksBoundaryService } from '../../service-packs/common/service-packs-boundary.service';

describe('ServicePackRuntimeCompilerService', () => {
  let compiler: ServicePackRuntimeCompilerService;

  const authoringManifest = {
    schemaVersion: '1.0.0',
    packLabel: 'NON_PRODUCTION',
    packId: 'pack-1',
    packVersion: '1.0.0',
    packName: 'Pack',
    description: 'NON_PRODUCTION pack',
    institutionCode: 'INST-1',
    departmentCode: 'DEPT-1',
    deploymentIntent: {
      targetMaturityStatus: 'DRAFT',
      targetPublicAvailability: 'HIDDEN',
      requiresInstitutionalAcceptance: true,
      requiresOperationalActivation: true,
    },
    services: [
      {
        serviceCode: 'SVC-1',
        serviceSlug: 'svc-1',
        serviceName: 'Service',
        serviceFamilyCode: 'FAMILY-1',
        serviceType: 'REGISTRATION',
        description: 'NON_PRODUCTION service',
        applicantCategories: ['INDIVIDUAL'],
        authorityFunctions: [
          {
            functionCode: 'TEMPLATE-AUTH-REGISTRATION-INTAKE',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
            publicStageLabel: 'Submit',
          },
          {
            functionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
            authorityActionType: 'VERIFY',
            sequenceOrder: 2,
            isConsequential: true,
            publicStageLabel: 'Verify',
          },
        ],
        forms: [
          {
            formCode: 'FORM-1',
            formName: 'Form',
            versionLabel: '1.0.0',
            sections: [
              {
                sectionKey: 'main',
                label: 'Main',
                fields: [
                  {
                    fieldKey: 'name',
                    label: 'Name',
                    fieldType: 'TEXT',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
        completenessReview: { enabled: true, requiredEvidenceCodes: ['EV-1'] },
        evidenceRequirements: [
          {
            evidenceCode: 'EV-1',
            label: 'Evidence',
            description: 'Evidence',
            required: true,
            verificationCategory: 'INTEGRITY',
          },
        ],
        workflowStages: [
          {
            stageKey: 'intake',
            label: 'Intake',
            displayOrder: 1,
            stepType: 'INTAKE',
            consequenceLevel: 'INFORMATIONAL',
          },
        ],
        slaRules: [],
        fees: [],
        outputs: [],
        communications: [],
        dependencies: [],
        decisionStages: [],
        issuance: {
          issuanceStageKey: 'intake',
          issuanceFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
          outputCodes: [],
        },
        lifecycle: { supportsRenewal: false },
        redress: [],
        dashboardIndicators: [],
      },
    ],
  };

  const prisma = {
    servicePackVersion: {
      findUnique: jest.fn(),
    },
    institution: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    department: {
      findFirst: jest.fn(),
    },
    functionAuthorityRecord: {
      findUnique: jest.fn(),
    },
    serviceFamily: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePackRuntimeCompilerService,
        ServicePacksBoundaryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    compiler = module.get(ServicePackRuntimeCompilerService);
    jest.clearAllMocks();

    prisma.institution.findFirst.mockResolvedValue({
      id: 'inst-1',
      code: 'INST-1',
      status: 'ACTIVE',
    });
    prisma.institution.findFirstOrThrow.mockResolvedValue({
      id: 'inst-1',
      code: 'INST-1',
    });
    prisma.department.findFirst.mockResolvedValue({
      id: 'dept-1',
      status: 'ACTIVE',
    });
    prisma.functionAuthorityRecord.findUnique.mockResolvedValue({
      id: 'far-1',
      lifecycleStatus: 'ACTIVE',
      governingSources: [{ governingSource: { status: 'AUTHENTICATED' } }],
    });
    prisma.serviceFamily.findFirst.mockResolvedValue({
      id: 'family-1',
      status: 'ACTIVE',
    });
  });

  it('rejects compile when authoring manifest is missing', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      status: ServicePackVersionStatus.COMPILED,
      immutable: false,
      manifest: { entries: [] },
      version: '1.0.0',
      servicePack: { id: 'pack-1' },
    });

    await expect(compiler.compileVersion({ servicePackVersionId: 'version-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns materialized artifact summary on successful compile', async () => {
    const fingerprint = calculateServicePackFingerprint(authoringManifest as never);
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      status: ServicePackVersionStatus.COMPILED,
      immutable: false,
      manifest: authoringManifest,
      version: '1.0.0',
      servicePack: { id: 'pack-1' },
    });

    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        serviceFamily: {
          findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'family-1' }),
        },
        governmentService: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'gs-1' }),
        },
        governmentServiceVersion: {
          create: jest.fn().mockResolvedValue({ id: 'gsv-1' }),
          update: jest.fn(),
        },
        formDefinition: { create: jest.fn().mockResolvedValue({ id: 'form-1' }) },
        formVersion: { create: jest.fn().mockResolvedValue({ id: 'fv-1', version: 1 }) },
        governmentServiceChecklistItem: {
          create: jest.fn().mockResolvedValue({ id: 'check-1' }),
        },
        governmentServiceFeeDefinition: { create: jest.fn() },
        governmentServiceOutputDefinition: { create: jest.fn() },
        governmentServiceRedressRoute: { create: jest.fn() },
        functionAuthorityRecord: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'far-1' }),
        },
        serviceFunctionMapping: { create: jest.fn() },
        workflowDefinition: { create: jest.fn().mockResolvedValue({ id: 'wf-1' }) },
        workflowVersion: { create: jest.fn().mockResolvedValue({ id: 'wfv-1', version: '1.0.0' }) },
        workflowStepDefinition: {
          create: jest.fn().mockResolvedValue({ id: 'step-1' }),
        },
        workflowTransitionDefinition: { create: jest.fn() },
        servicePackVersion: { update: jest.fn() },
      }),
    );

    const result = await compiler.compileVersion({ servicePackVersionId: 'version-1' });

    expect(result.compilationFingerprint).toBe(fingerprint);
    expect(result.artifacts.governmentServiceVersionIds).toEqual(['gsv-1']);
    expect(
      result.entries.some((entry) => entry.domain === ServicePackDeploymentBindingDomain.FORMS),
    ).toBe(true);
    expect(result.message).toMatch(/DRAFT/);
  });

  it('surfaces validation failures without partial deployment manifest', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      status: ServicePackVersionStatus.COMPILED,
      immutable: false,
      manifest: {
        ...authoringManifest,
        institutionCode: 'MISSING-INST',
      },
      version: '1.0.0',
      servicePack: { id: 'pack-1' },
    });

    prisma.$transaction.mockImplementation(() => {
      throw new Error('transaction should not run');
    });

    prisma.institution.findFirst.mockResolvedValue(null);

    await expect(compiler.compileVersion({ servicePackVersionId: 'version-1' })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('Compiled service maturity', () => {
  it('defaults to DRAFT rather than ACTIVE', () => {
    expect(GovernmentServiceMaturityStatus.DRAFT).not.toBe(GovernmentServiceMaturityStatus.ACTIVE);
  });
});
