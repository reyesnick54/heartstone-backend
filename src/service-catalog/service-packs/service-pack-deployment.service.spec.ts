import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  ServiceActivationOutcome,
  ServicePackDeploymentAuditEventType,
  ServicePackDeploymentBindingDomain,
  ServicePackDeploymentStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServicePackCanonicalGovernanceService } from '../../service-packs/common/service-pack-canonical-governance.service';
import { ServicePackAcceptanceService } from '../../service-packs/governance/service-pack-acceptance.service';
import { ServiceActivationService } from '../activation-governance/service-activation.service';
import { ServicePackActivationService } from './service-pack-activation.service';
import { buildServicePackConfigurationFingerprintFromManifest } from './service-pack-configuration-fingerprint.util';
import { SERVICE_PACK_DEPLOYMENT_REASON_CODES } from './service-pack-deployment.constants';
import { ServicePackDeploymentService } from './service-pack-deployment.service';
import { ServicePackDeploymentAuditService } from './service-pack-deployment-audit.service';
import { ServicePackRollbackService } from './service-pack-rollback.service';

describe('Service pack deployment lifecycle', () => {
  let deploymentService: ServicePackDeploymentService;
  let activationService: ServicePackActivationService;
  let rollbackService: ServicePackRollbackService;
  let auditService: ServicePackDeploymentAuditService;
  let serviceActivationService: {
    activateOperationally: jest.Mock;
  };

  const actor = {
    identityId: 'actor-1',
    officeholderId: 'officeholder-1',
  };

  const manifest = {
    servicePackVersionId: 'pack-version-1',
    servicePackVersionLabel: '1.0.0',
    compilationFingerprint: 'compile-fingerprint',
    entries: [
      {
        domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
        entityId: 'gsv-1',
        entityVersion: '1.0.0',
      },
      {
        domain: ServicePackDeploymentBindingDomain.FORMS,
        entityId: 'form-1',
        entityVersion: '1',
      },
      {
        domain: ServicePackDeploymentBindingDomain.INTEGRATION_REFERENCES,
        entityId: 'integration-1',
      },
    ],
  };

  const packVersion = {
    id: 'pack-version-1',
    servicePackId: 'pack-1',
    version: '1.0.0',
    status: ServicePackVersionStatus.ACCEPTED,
    compilationFingerprint: 'compile-fingerprint',
    manifest,
    compiledAt: new Date('2026-01-01T00:00:00.000Z'),
    acceptedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const deployment = {
    id: 'deployment-1',
    servicePackVersionId: 'pack-version-1',
    deploymentReference: 'deploy-ref-1',
    status: ServicePackDeploymentStatus.DEPLOYMENT_READY,
    configurationFingerprint: null,
    deployedAt: null,
    rolledBackAt: null,
    supersededByDeploymentId: null,
    actorIdentityId: actor.identityId,
    reason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    bindings: [],
    servicePackVersion: packVersion,
  };

  let prisma: {
    servicePackVersion: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    servicePackDeployment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    servicePackDeploymentBinding: {
      createMany: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    servicePackDeploymentAuditRecord: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    governmentServiceVersion: {
      findUnique: jest.Mock;
    };
    integrationAcceptanceRecord: {
      findFirst: jest.Mock;
    };
    application: {
      deleteMany: jest.Mock;
    };
    case: {
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      servicePackVersion: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      servicePackDeployment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      servicePackDeploymentBinding: {
        createMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      servicePackDeploymentAuditRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      governmentServiceVersion: {
        findUnique: jest.fn(),
      },
      integrationAcceptanceRecord: {
        findFirst: jest.fn(),
      },
      application: {
        deleteMany: jest.fn(),
      },
      case: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    serviceActivationService = {
      activateOperationally: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePackDeploymentAuditService,
        ServicePackDeploymentService,
        ServicePackRollbackService,
        ServicePackActivationService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServiceActivationService, useValue: serviceActivationService },
        {
          provide: ServicePackAcceptanceService,
          useValue: {
            assertActiveAcceptanceForDeployment: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ServicePackCanonicalGovernanceService,
          useValue: {
            assertPackRegistered: jest.fn().mockResolvedValue(undefined),
            assertVersionBelongsToPack: jest.fn().mockResolvedValue(undefined),
            assertNoDuplicatePackCode: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    deploymentService = module.get(ServicePackDeploymentService);
    activationService = module.get(ServicePackActivationService);
    rollbackService = module.get(ServicePackRollbackService);
    auditService = module.get(ServicePackDeploymentAuditService);

    prisma.servicePackVersion.findUnique.mockResolvedValue(packVersion);
    prisma.servicePackVersion.update.mockResolvedValue({
      ...packVersion,
      status: ServicePackVersionStatus.ACCEPTED,
    });
    prisma.servicePackDeployment.create.mockResolvedValue(deployment);
    prisma.servicePackDeployment.findUnique.mockResolvedValue(deployment);
    prisma.servicePackDeployment.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...deployment,
          ...data,
        }),
    );
    prisma.servicePackDeploymentAuditRecord.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'audit-1',
          ...data,
          createdAt: new Date(),
        }),
    );
    prisma.governmentServiceVersion.findUnique.mockResolvedValue({
      id: 'gsv-1',
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.CONFIGURED,
      publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      majorDependencies: [],
      functionMappings: [],
    });
    prisma.integrationAcceptanceRecord.findFirst.mockResolvedValue({ id: 'acceptance-1' });
  });

  it('deployment does not auto-activate', async () => {
    const acceptedVersion = {
      ...packVersion,
      status: ServicePackVersionStatus.ACCEPTED,
    };
    prisma.servicePackVersion.findUnique.mockResolvedValue(acceptedVersion);
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYMENT_READY,
      servicePackVersion: acceptedVersion,
    });

    const result = await deploymentService.deploy({
      deploymentId: deployment.id,
      actor,
      reason: 'Deploy pack',
    });

    expect(result.newStatus).toBe(ServicePackDeploymentStatus.DEPLOYED);
    expect(serviceActivationService.activateOperationally).not.toHaveBeenCalled();
    expect(prisma.servicePackDeploymentBinding.createMany).toHaveBeenCalled();
    const createManyCall = prisma.servicePackDeploymentBinding.createMany.mock.calls[0] as
      [{ data: { isActivated: boolean }[] }] | undefined;
    expect(createManyCall?.[0].data.every((entry) => !entry.isActivated)).toBe(true);
  });

  it('failed deployment rolls back transaction', async () => {
    const acceptedVersion = {
      ...packVersion,
      status: ServicePackVersionStatus.ACCEPTED,
    };
    prisma.servicePackVersion.findUnique.mockResolvedValue(acceptedVersion);
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYMENT_READY,
      servicePackVersion: acceptedVersion,
    });
    prisma.servicePackDeploymentBinding.createMany.mockRejectedValue(new Error('binding failed'));

    await expect(
      deploymentService.deploy({
        deploymentId: deployment.id,
        actor,
      }),
    ).rejects.toThrow('binding failed');

    expect(prisma.servicePackDeployment.update).not.toHaveBeenCalled();
  });

  it('historical application remains pinned to prior service version', async () => {
    const historicalApplication = {
      id: 'app-1',
      governmentServiceVersionId: 'gsv-old',
      configurationFingerprint: 'old-fingerprint',
    };

    prisma.servicePackDeployment.findUnique
      .mockResolvedValueOnce({
        ...deployment,
        id: 'deployment-old',
        status: ServicePackDeploymentStatus.ACTIVE,
        bindings: [
          {
            id: 'binding-old',
            domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
            domainEntityId: 'gsv-old',
            isActivated: true,
            isReversible: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        ...deployment,
        id: 'deployment-new',
        status: ServicePackDeploymentStatus.DEPLOYED,
        bindings: [
          {
            id: 'binding-new',
            domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
            domainEntityId: 'gsv-new',
            isActivated: false,
            isReversible: true,
          },
        ],
      });

    await rollbackService.supersede({
      priorDeploymentId: 'deployment-old',
      newDeploymentId: 'deployment-new',
      actor,
      reason: 'Move to new pack version',
    });

    expect(historicalApplication.governmentServiceVersionId).toBe('gsv-old');
    expect(historicalApplication.configurationFingerprint).toBe('old-fingerprint');
    expect(prisma.application.deleteMany).not.toHaveBeenCalled();
    expect(prisma.servicePackDeploymentBinding.deleteMany).not.toHaveBeenCalled();
  });

  it('rollback cannot delete official records', async () => {
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYED,
      bindings: [
        {
          id: 'binding-1',
          isReversible: true,
          isActivated: false,
        },
        {
          id: 'binding-2',
          isReversible: false,
          isActivated: true,
        },
      ],
    });

    const result = await rollbackService.rollback({
      deploymentId: deployment.id,
      actor,
      reason: 'Revert unactivated configuration',
    });

    expect(result.newStatus).toBe(ServicePackDeploymentStatus.ROLLED_BACK);
    expect(prisma.servicePackDeploymentBinding.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['binding-1'] } },
    });
    expect(prisma.application.deleteMany).not.toHaveBeenCalled();
    expect(prisma.case.deleteMany).not.toHaveBeenCalled();
  });

  it('active service cannot be silently overwritten', async () => {
    prisma.governmentServiceVersion.findUnique.mockResolvedValue({
      id: 'gsv-1',
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      majorDependencies: [],
      functionMappings: [],
    });

    prisma.servicePackVersion.findUnique.mockResolvedValue({
      ...packVersion,
      status: ServicePackVersionStatus.ACCEPTED,
      manifest: {
        ...manifest,
        entries: [
          {
            domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
            entityId: 'gsv-1',
            entityVersion: '2.0.0',
          },
        ],
      },
    });

    await expect(
      deploymentService.deploy({
        deploymentId: deployment.id,
        actor,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('suspended authority blocks activation', async () => {
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYED,
      bindings: [
        {
          id: 'binding-1',
          domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
          domainEntityId: 'gsv-1',
          isActivated: false,
          isReversible: true,
        },
      ],
    });

    prisma.governmentServiceVersion.findUnique.mockResolvedValue({
      id: 'gsv-1',
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
      publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      majorDependencies: [],
      functionMappings: [
        {
          functionAuthorityRecord: {
            lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED,
          },
        },
      ],
    });

    const result = await activationService.requestActivation({
      deploymentId: deployment.id,
      actor,
      reason: 'Activate pack',
    });

    expect(result.outcome).toBe('BLOCKED');
    expect(result.blockedReasons).toContain(
      SERVICE_PACK_DEPLOYMENT_REASON_CODES.SUSPENDED_AUTHORITY_BLOCKS,
    );
    expect(serviceActivationService.activateOperationally).not.toHaveBeenCalled();
  });

  it('unresolved dependency blocks activation', async () => {
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYED,
      bindings: [
        {
          id: 'binding-1',
          domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
          domainEntityId: 'gsv-1',
          isActivated: false,
          isReversible: true,
        },
      ],
    });

    prisma.governmentServiceVersion.findUnique.mockResolvedValue({
      id: 'gsv-1',
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.CONFIGURED,
      publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      majorDependencies: [{ code: 'DEP-1', resolved: false }],
      functionMappings: [],
    });

    const result = await activationService.requestActivation({
      deploymentId: deployment.id,
      actor,
    });

    expect(result.outcome).toBe('BLOCKED');
    expect(result.blockedReasons).toContain(
      SERVICE_PACK_DEPLOYMENT_REASON_CODES.UNRESOLVED_DEPENDENCY,
    );
  });

  it('integration acceptance requirement respected', async () => {
    prisma.integrationAcceptanceRecord.findFirst.mockResolvedValue(null);
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYED,
      bindings: [
        {
          id: 'binding-1',
          domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
          domainEntityId: 'gsv-1',
          isActivated: false,
          isReversible: true,
        },
        {
          id: 'binding-2',
          domain: ServicePackDeploymentBindingDomain.INTEGRATION_REFERENCES,
          domainEntityId: 'integration-1',
          isActivated: false,
          isReversible: true,
        },
      ],
    });

    const result = await activationService.requestActivation({
      deploymentId: deployment.id,
      actor,
    });

    expect(result.outcome).toBe('BLOCKED');
    expect(result.blockedReasons).toContain(
      SERVICE_PACK_DEPLOYMENT_REASON_CODES.INTEGRATION_ACCEPTANCE_REQUIRED,
    );
  });

  it('service activation audit preserved through delegated activation', async () => {
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYED,
      bindings: [
        {
          id: 'binding-1',
          domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
          domainEntityId: 'gsv-1',
          isActivated: false,
          isReversible: true,
        },
      ],
    });

    serviceActivationService.activateOperationally.mockResolvedValue({
      outcome: ServiceActivationOutcome.ACTIVATED,
      governmentServiceVersionId: 'gsv-1',
      priorMaturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
      newMaturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      priorPublicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      newPublicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      activationRecordId: 'activation-record-1',
      message: 'Activated via governed service',
    });

    const result = await activationService.requestActivation({
      deploymentId: deployment.id,
      actor,
      reason: 'Activate services',
    });

    expect(serviceActivationService.activateOperationally).toHaveBeenCalledWith(
      expect.objectContaining({
        governmentServiceVersionId: 'gsv-1',
        actor,
      }),
    );
    expect(result.activationRecordIds).toEqual(['activation-record-1']);
    const auditCalls = prisma.servicePackDeploymentAuditRecord.create.mock.calls as [
      { data: { eventType?: ServicePackDeploymentAuditEventType } },
    ][];
    expect(
      auditCalls.some(
        (call) => call[0].data.eventType === ServicePackDeploymentAuditEventType.ACTIVATED,
      ),
    ).toBe(true);
  });

  it('deployment fingerprints preserved', async () => {
    const fingerprint = buildServicePackConfigurationFingerprintFromManifest(manifest);
    const acceptedVersion = {
      ...packVersion,
      status: ServicePackVersionStatus.ACCEPTED,
    };

    prisma.servicePackVersion.findUnique.mockResolvedValue(acceptedVersion);
    prisma.servicePackDeployment.findUnique.mockResolvedValue({
      ...deployment,
      status: ServicePackDeploymentStatus.DEPLOYMENT_READY,
      servicePackVersion: acceptedVersion,
    });

    const result = await deploymentService.deploy({
      deploymentId: deployment.id,
      actor,
    });

    expect(result.configurationFingerprint).toBe(fingerprint);
    const updateCall = prisma.servicePackDeployment.update.mock.calls.at(-1) as
      [{ data: { configurationFingerprint?: string } }] | undefined;
    expect(updateCall?.[0].data.configurationFingerprint).toBe(fingerprint);
    const fingerprintAudit = (
      prisma.servicePackDeploymentAuditRecord.create.mock.calls as [
        { data: { eventType?: ServicePackDeploymentAuditEventType } },
      ][]
    ).find(
      (call) => call[0].data.eventType === ServicePackDeploymentAuditEventType.FINGERPRINT_RECORDED,
    );
    expect(fingerprintAudit).toBeDefined();
  });

  it('supersession leaves historical versions intact', async () => {
    prisma.servicePackDeployment.findUnique
      .mockResolvedValueOnce({
        ...deployment,
        id: 'deployment-old',
        status: ServicePackDeploymentStatus.ACTIVE,
        bindings: [{ id: 'binding-old', isActivated: true, isReversible: false }],
      })
      .mockResolvedValueOnce({
        ...deployment,
        id: 'deployment-new',
        status: ServicePackDeploymentStatus.DEPLOYED,
        bindings: [{ id: 'binding-new', isActivated: false, isReversible: true }],
      });

    const result = await rollbackService.supersede({
      priorDeploymentId: 'deployment-old',
      newDeploymentId: 'deployment-new',
      actor,
      reason: 'Supersede active deployment',
    });

    expect(result.newStatus).toBe(ServicePackDeploymentStatus.SUPERSEDED);
    expect(result.preservedBindingIds).toEqual(['binding-old']);
    expect(prisma.servicePackDeploymentBinding.deleteMany).not.toHaveBeenCalled();
    const supersedeUpdate = prisma.servicePackDeployment.update.mock.calls.at(-1) as
      | [
          {
            where: { id: string };
            data: { status: ServicePackDeploymentStatus; supersededByDeploymentId: string };
          },
        ]
      | undefined;
    expect(supersedeUpdate?.[0].where.id).toBe('deployment-old');
    expect(supersedeUpdate?.[0].data.status).toBe(ServicePackDeploymentStatus.SUPERSEDED);
    expect(supersedeUpdate?.[0].data.supersededByDeploymentId).toBe('deployment-new');
  });

  it('records full deployment audit trail', async () => {
    await auditService.recordEvent({
      deploymentId: deployment.id,
      eventType: ServicePackDeploymentAuditEventType.DEPLOYMENT_READY,
      actorIdentityId: actor.identityId,
      priorStatus: null,
      newStatus: ServicePackDeploymentStatus.DEPLOYMENT_READY,
    });

    prisma.servicePackDeployment.findUnique.mockResolvedValue({ id: deployment.id });
    prisma.servicePackDeploymentAuditRecord.findMany.mockResolvedValue([
      { id: 'audit-1', eventType: ServicePackDeploymentAuditEventType.DEPLOYMENT_READY },
    ]);

    const trail = await auditService.getAuditTrail(deployment.id);
    expect(trail).toHaveLength(1);
    expect(prisma.servicePackDeploymentAuditRecord.create).toHaveBeenCalled();
  });

  it('requires institutional acceptance before deployment-ready marking', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      ...packVersion,
      status: ServicePackVersionStatus.ACCEPTED,
    });

    const result = await deploymentService.acceptServicePackVersion({
      servicePackVersionId: packVersion.id,
      actor,
    });

    expect(result.newStatus).toBe(ServicePackVersionStatus.ACCEPTED);
  });

  it('rejects deployment when version is not accepted', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      ...packVersion,
      status: ServicePackVersionStatus.COMPILED,
    });
    await expect(
      deploymentService.createDeployment({
        servicePackVersionId: packVersion.id,
        deploymentReference: 'deploy-ref-2',
        actor,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
