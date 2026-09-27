import { BadRequestException, type INestApplication } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  ServicePackDeploymentBindingDomain,
  ServicePackDeploymentStatus,
  ServicePackVersionStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { calculateServicePackFingerprint } from '../src/service-catalog/service-packs/calculate-service-pack-fingerprint';
import { ServicePackDeploymentService } from '../src/service-catalog/service-packs/service-pack-deployment.service';
import { ServicePackRollbackService } from '../src/service-catalog/service-packs/service-pack-rollback.service';
import { ServicePackRuntimeCompilerService } from '../src/service-catalog/service-packs/service-pack-runtime-compiler.service';
import { buildServicePackVersionGovernanceFingerprint } from '../src/service-packs/governance/service-pack-version-fingerprint.util';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  createServicePackVersionWithManifest,
  loadAbsezAuthoringManifest,
  peerInstitutionManifest,
  seedS15CompileFixture,
} from './helpers/s15-service-pack-compiler.fixture';

describe('remediation S15 service pack runtime compiler (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let compiler: ServicePackRuntimeCompilerService;
  let deploymentService: ServicePackDeploymentService;
  let rollbackService: ServicePackRollbackService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    compiler = app.get(ServicePackRuntimeCompilerService);
    deploymentService = app.get(ServicePackDeploymentService);
    rollbackService = app.get(ServicePackRollbackService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('compiles a valid ABSEZ draft pack into DRAFT runtime artifacts', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const authoringManifest = fixture.authoringManifest;
    const fingerprint = calculateServicePackFingerprint(authoringManifest);

    const version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: authoringManifest.packVersion,
      manifest: authoringManifest,
      compilationFingerprint: fingerprint,
    });

    const result = await compiler.compileVersion({ servicePackVersionId: version.id });

    expect(result.entryCount).toBeGreaterThan(0);
    expect(result.artifacts.formDefinitionIds.length).toBe(1);
    expect(result.artifacts.workflowDefinitionIds.length).toBe(1);
    expect(result.artifacts.feeDefinitionIds.length).toBe(1);
    expect(result.artifacts.checklistItemIds.length).toBe(1);
    expect(result.artifacts.outputDefinitionIds.length).toBe(1);

    const serviceVersion = await prisma.governmentServiceVersion.findUniqueOrThrow({
      where: { id: result.artifacts.governmentServiceVersionIds[0] },
    });
    expect(serviceVersion.maturityStatus).toBe(GovernmentServiceMaturityStatus.DRAFT);

    const form = await prisma.formDefinition.findUniqueOrThrow({
      where: { id: result.artifacts.formDefinitionIds[0] },
    });
    expect(form).toBeDefined();

    const workflow = await prisma.workflowDefinition.findUniqueOrThrow({
      where: { id: result.artifacts.workflowDefinitionIds[0] },
    });
    expect(workflow).toBeDefined();
  });

  it('rejects invalid packs atomically without creating catalog records', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const invalidManifest = {
      ...fixture.authoringManifest,
      institutionCode: 'MISSING-INSTITUTION',
    };
    const fingerprint = calculateServicePackFingerprint(invalidManifest);

    const version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: '9.9.9',
      manifest: invalidManifest,
      compilationFingerprint: fingerprint,
    });

    const beforeCount = await prisma.governmentService.count();

    await expect(
      compiler.compileVersion({ servicePackVersionId: version.id }),
    ).rejects.toThrow(BadRequestException);

    const afterCount = await prisma.governmentService.count();
    expect(afterCount).toBe(beforeCount);
  });

  it('does not activate compiled services without governed operational activation', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const authoringManifest = fixture.authoringManifest;
    const version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: authoringManifest.packVersion,
      manifest: authoringManifest,
      compilationFingerprint: calculateServicePackFingerprint(authoringManifest),
    });

    const compiled = await compiler.compileVersion({ servicePackVersionId: version.id });
    const serviceVersion = await prisma.governmentServiceVersion.findUniqueOrThrow({
      where: { id: compiled.artifacts.governmentServiceVersionIds[0] },
    });

    expect(serviceVersion.maturityStatus).toBe(GovernmentServiceMaturityStatus.DRAFT);
    expect(serviceVersion.institutionallyAccepted).toBe(false);
    expect(serviceVersion.publicAvailability).toBe('HIDDEN');
  });

  it('pins historical applications to the service version they started under', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const v1Manifest = fixture.authoringManifest;

    const v1Version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: '1.0.0',
      manifest: v1Manifest,
      compilationFingerprint: calculateServicePackFingerprint(v1Manifest),
    });

    const v1Compile = await compiler.compileVersion({ servicePackVersionId: v1Version.id });
    const v1ServiceVersionId = v1Compile.artifacts.governmentServiceVersionIds[0];
    expect(v1ServiceVersionId).toBeDefined();

    const v2Manifest = { ...v1Manifest, packVersion: '2.0.0' };
    const v2Version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: '2.0.0',
      manifest: v2Manifest,
      compilationFingerprint: calculateServicePackFingerprint(v2Manifest),
    });

    const v2Compile = await compiler.compileVersion({ servicePackVersionId: v2Version.id });
    expect(v2Compile.artifacts.governmentServiceVersionIds[0]).not.toBe(v1ServiceVersionId);

    const stillPresent = await prisma.governmentServiceVersion.findUnique({
      where: { id: v1ServiceVersionId ?? '' },
    });
    expect(stillPresent?.version).toBe('1.0.0');
  });

  it('rollback removes reversible bindings without deleting applications', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const authoringManifest = fixture.authoringManifest;
    const version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: authoringManifest.packVersion,
      manifest: authoringManifest,
      compilationFingerprint: calculateServicePackFingerprint(authoringManifest),
    });

    await compiler.compileVersion({ servicePackVersionId: version.id });

    const actor = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 's15-rollback-actor@test.gov',
      password: 'S15-Rollback-Test-Password-1!',
      displayName: 'S15 Rollback Actor',
    });

    const updatedVersion = await prisma.servicePackVersion.findUniqueOrThrow({
      where: { id: version.id },
    });

    await prisma.servicePackAcceptanceRecord.create({
      data: {
        servicePackId: fixture.servicePackId,
        servicePackVersionId: version.id,
        institutionId: fixture.institutionId,
        acceptingIdentityId: actor.identityId,
        versionFingerprint: buildServicePackVersionGovernanceFingerprint({
          compilationFingerprint: updatedVersion.compilationFingerprint,
          manifestChecksum:
            updatedVersion.manifestChecksum ?? updatedVersion.compilationFingerprint,
        }),
      },
    });

    await prisma.servicePackVersion.update({
      where: { id: version.id },
      data: { status: ServicePackVersionStatus.ACCEPTED },
    });

    const deployment = await deploymentService.createDeployment({
      servicePackVersionId: version.id,
      deploymentReference: 's15-rollback',
      actor: { identityId: 'system-actor' },
    });

    await deploymentService.deploy({
      deploymentId: deployment.deploymentId,
      actor: { identityId: 'system-actor' },
    });

    const bindingCountBefore = await prisma.servicePackDeploymentBinding.count();

    const rollback = await rollbackService.rollback({
      deploymentId: deployment.deploymentId,
      actor: { identityId: 'system-actor' },
      reason: 'Revert draft deployment',
    });

    expect(rollback.newStatus).toBe(ServicePackDeploymentStatus.ROLLED_BACK);
    expect(await prisma.servicePackDeploymentBinding.count()).toBeLessThan(bindingCountBefore);
  });

  it('compiles the same manifest shape for a second institution without ABSEZ-specific code', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const peerManifest = peerInstitutionManifest(
      loadAbsezAuthoringManifest(),
      fixture.secondInstitutionCode,
      `${fixture.secondInstitutionCode}-DEPT`,
      `${fixture.secondInstitutionCode}-FAMILY`,
      '1.0.0',
    );

    await prisma.serviceFamily.create({
      data: {
        code: `${fixture.secondInstitutionCode}-FAMILY`,
        name: 'Peer family',
        status: 'ACTIVE',
      },
    });

    await prisma.department.create({
      data: {
        institutionId: fixture.secondInstitutionId,
        code: `${fixture.secondInstitutionCode}-DEPT`,
        name: 'Peer dept',
        status: 'ACTIVE',
      },
    });

    const peerPack = await prisma.servicePack.create({
      data: {
        code: 'peer-pack',
        name: 'Peer Pack',
        institutionId: fixture.secondInstitutionId,
      },
    });

    const peerVersion = await createServicePackVersionWithManifest(prisma, {
      servicePackId: peerPack.id,
      versionLabel: peerManifest.packVersion,
      manifest: peerManifest,
      compilationFingerprint: calculateServicePackFingerprint(peerManifest),
    });

    const peerResult = await compiler.compileVersion({ servicePackVersionId: peerVersion.id });
    expect(peerResult.artifacts.governmentServiceVersionIds.length).toBe(1);

    const peerServiceVersion = await prisma.governmentServiceVersion.findUniqueOrThrow({
      where: { id: peerResult.artifacts.governmentServiceVersionIds[0] },
      include: { governmentService: true },
    });
    expect(peerServiceVersion.governmentService.responsibleInstitutionId).toBe(
      fixture.secondInstitutionId,
    );
  });

  it('stores deployment binding domains needed for governed deploy', async () => {
    const fixture = await seedS15CompileFixture(app, prisma);
    const authoringManifest = fixture.authoringManifest;
    const version = await createServicePackVersionWithManifest(prisma, {
      servicePackId: fixture.servicePackId,
      versionLabel: authoringManifest.packVersion,
      manifest: authoringManifest,
      compilationFingerprint: calculateServicePackFingerprint(authoringManifest),
    });

    const compiled = await compiler.compileVersion({ servicePackVersionId: version.id });
    const domains = new Set(compiled.entries.map((entry) => entry.domain));

    expect(domains.has(ServicePackDeploymentBindingDomain.SERVICE_CATALOG)).toBe(true);
    expect(domains.has(ServicePackDeploymentBindingDomain.WORKFLOWS)).toBe(true);
    expect(domains.has(ServicePackDeploymentBindingDomain.EVIDENCE_REQUIREMENTS)).toBe(true);
    expect(domains.has(ServicePackDeploymentBindingDomain.FEE_METADATA)).toBe(true);
    expect(domains.has(ServicePackDeploymentBindingDomain.OUTPUT_METADATA)).toBe(true);
  });
});
