import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  ServiceActivationOutcome,
  ServiceReadinessLevel,
} from '@prisma/client';

import { resetAllTestData } from '../../../test/helpers/integration-app';
import { Phase5FActivationFixtures } from '../../../test/helpers/phase-5f-activation-fixtures';
import { AuthorityModule } from '../../authority/authority.module';
import { FunctionActivationService } from '../../authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../../authority/governing-sources/governing-sources.service';
import appConfig from '../../config/app.config';
import identityConfig from '../../config/identity.config';
import redisConfig from '../../config/redis.config';
import securityConfig from '../../config/security.config';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogModule } from '../service-catalog.module';
import { OperationalServiceDiscoveryService } from './operational-service-discovery.service';
import { ServiceActivationService } from './service-activation.service';
import { ServiceReadinessService } from './service-readiness.service';

describe('ServiceActivationService (Phase 5F)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let activation: ServiceActivationService;
  let readiness: ServiceReadinessService;
  let discovery: OperationalServiceDiscoveryService;
  let fixtures: Phase5FActivationFixtures;
  let serviceFamilyId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
        DatabaseModule,
        AuthorityModule,
        ServiceCatalogModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    activation = moduleRef.get(ServiceActivationService);
    readiness = moduleRef.get(ServiceReadinessService);
    discovery = moduleRef.get(OperationalServiceDiscoveryService);
    fixtures = new Phase5FActivationFixtures(
      prisma,
      moduleRef.get(GoverningSourcesService),
      moduleRef.get(FunctionAuthorityRecordsService),
      moduleRef.get(FunctionActivationService),
    );
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    const family = await prisma.serviceFamily.create({
      data: { code: '5F-FAMILY', name: '5F Family' },
    });
    serviceFamilyId = family.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  function authorizedActor(ctx: Awaited<ReturnType<typeof fixtures.seedStructuralContext>>) {
    return {
      identityId: ctx.identityId,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    };
  }

  it('does not automatically activate a configured service', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.maturityStatus).toBe(GovernmentServiceMaturityStatus.CONFIGURED);
    expect(version?.institutionallyAccepted).toBe(false);
  });

  it('blocks ordinary applicant activation', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);
    const applicantId = await fixtures.seedApplicantIdentity();

    const result = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: { identityId: applicantId },
    });

    expect(result.outcome).toBe(ServiceActivationOutcome.DENIED);
  });

  it('blocks technical administrator without institutional authority', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);
    const adminId = await fixtures.seedAdminIdentityWithoutAuthority();

    const result = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: { identityId: adminId },
    });

    expect(result.outcome).toBe(ServiceActivationOutcome.DENIED);
  });

  it('requires activation authority mapping configuration', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId, {
      withActivationAuthority: false,
    });

    const result = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });

    expect(result.outcome).toBe(ServiceActivationOutcome.REQUIRES_CONFIGURATION);
  });

  it('blocks application-capable activation without active form', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId, {
      withActiveForm: false,
    });

    const assessment = await readiness.assessReadiness(service.governmentServiceVersionId);
    expect(assessment.technicallyReady).toBe(false);
    expect(assessment.blockingIssues.some((issue) => issue.includes('PUBLISHED_FORM_EXISTS'))).toBe(
      true,
    );
  });

  it('blocks activation without checklist requirements', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId, {
      withChecklist: false,
    });

    const assessment = await readiness.assessReadiness(service.governmentServiceVersionId);
    expect(assessment.technicallyReady).toBe(false);
    expect(
      assessment.blockingIssues.some((issue) => issue.includes('CURRENT_REQUIREMENTS_EXIST')),
    ).toBe(true);
  });

  it('does not fabricate institutional acceptance from technical test pass alone', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId, {
      testReadinessStatus: 'NOT_TESTED',
    });

    await activation.markTechnicalTestsPassed(service.governmentServiceVersionId);

    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.testReadinessStatus).toBe('TECHNICAL_TESTS_PASSED');
    expect(version?.institutionallyAccepted).toBe(false);
  });

  it('activates through institutional and operational pathways with authority', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const acceptance = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });
    expect(acceptance.outcome).toBe(ServiceActivationOutcome.ACTIVATED);

    const operational = await activation.activateOperationally({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });
    expect(operational.outcome).toBe(ServiceActivationOutcome.ACTIVATED);
    expect(operational.newMaturityStatus).toBe(GovernmentServiceMaturityStatus.ACTIVE);

    const active = await discovery.listActiveServices();
    expect(
      active.some((item) => item.governmentServiceVersionId === service.governmentServiceVersionId),
    ).toBe(true);
  });

  it('removes suspended service from active discovery while preserving history', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });
    await activation.activateOperationally({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });
    await activation.suspend({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
      reason: 'temporary suspension',
    });

    const active = await discovery.listActiveServices();
    expect(
      active.some((item) => item.governmentServiceVersionId === service.governmentServiceVersionId),
    ).toBe(false);

    const history = await discovery.getServiceVersionHistory(service.governmentServiceId);
    expect(history.length).toBe(1);
    expect(history[0]?.maturityStatus).toBe(GovernmentServiceMaturityStatus.SUSPENDED);
    expect(history[0]?.publicAvailability).toBe(GovernmentServicePublicAvailability.SUSPENDED);
  });

  it('supersedes prior version without erasing it', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const first = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const secondVersion = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: first.governmentServiceId,
        version: '2.0.0',
        maturityStatus: GovernmentServiceMaturityStatus.CONFIGURED,
        publicDescription: 'Version 2',
        internalGoverningSourceMaterial: 'v2 source',
        majorDependencies: [{ label: 'v2 dependency' }],
        effectiveFrom: new Date('2020-01-01'),
        testReadinessStatus: 'TECHNICAL_TESTS_PASSED',
        activationFunctionAuthorityRecordId: ctx.activationFunctionId,
      },
    });

    await activation.supersede({
      priorGovernmentServiceVersionId: first.governmentServiceVersionId,
      newGovernmentServiceVersionId: secondVersion.id,
      actor: authorizedActor(ctx),
    });

    const prior = await prisma.governmentServiceVersion.findUnique({
      where: { id: first.governmentServiceVersionId },
    });
    expect(prior?.maturityStatus).toBe(GovernmentServiceMaturityStatus.SUPERSEDED);
    expect(prior?.supersededByVersionId).toBe(secondVersion.id);
    expect(prior?.id).not.toBe(secondVersion.id);
  });

  it('keeps pilot scope distinct from full operational activation', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const pilot = await activation.activatePilot({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
      pilotScopeDescription: 'Limited to internal testers',
    });

    expect(pilot.newPublicAvailability).toBe(GovernmentServicePublicAvailability.PILOT_ONLY);
    expect(pilot.newMaturityStatus).not.toBe(GovernmentServiceMaturityStatus.ACTIVE);

    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.pilotScopeDescription).toBe('Limited to internal testers');
  });

  it('records append-only activation audit entries', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const acceptance = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
      reason: 'audit immutability',
    });

    await activation.activateOperationally({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });

    const records = await prisma.serviceActivationRecord.findMany({
      where: { governmentServiceVersionId: service.governmentServiceVersionId },
      orderBy: { createdAt: 'asc' },
    });
    expect(records).toHaveLength(2);
    expect(records[0]?.id).toBe(acceptance.activationRecordId);
    expect(records[0]?.reason).toBe('audit immutability');

    const assessment = await readiness.assessReadiness(service.governmentServiceVersionId);
    expect(assessment.achievedLevel).toBe(ServiceReadinessLevel.OPERATIONALLY_ACTIVE);
  });
});
