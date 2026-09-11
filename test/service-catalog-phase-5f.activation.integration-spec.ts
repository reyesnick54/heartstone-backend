import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  GovernmentServiceMaturityStatus,
  ServiceActivationOutcome,
  ServiceReadinessLevel,
} from '@prisma/client';

import { AuthorityModule } from '../src/authority/authority.module';
import { FunctionActivationService } from '../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../src/authority/governing-sources/governing-sources.service';
import appConfig from '../src/config/app.config';
import identityConfig from '../src/config/identity.config';
import redisConfig from '../src/config/redis.config';
import securityConfig from '../src/config/security.config';
import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { ServiceActivationService } from '../src/service-catalog/activation-governance/service-activation.service';
import { ServicePublicationGovernanceService } from '../src/service-catalog/activation-governance/service-publication-governance.service';
import { ServiceReadinessService } from '../src/service-catalog/activation-governance/service-readiness.service';
import { ServiceCatalogModule } from '../src/service-catalog/service-catalog.module';
import { resetAllTestData } from './helpers/integration-app';
import { Phase5FActivationFixtures } from './helpers/phase-5f-activation-fixtures';

describe('Service catalog activation governance (Phase 5F integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let activation: ServiceActivationService;
  let readiness: ServiceReadinessService;
  let publication: ServicePublicationGovernanceService;
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
    publication = moduleRef.get(ServicePublicationGovernanceService);
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
      data: { code: '5F-INT-FAMILY', name: '5F Integration Family' },
    });
    serviceFamilyId = family.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('separates publication from operational activation for information-only services', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);
    await prisma.governmentService.update({
      where: { id: service.governmentServiceId },
      data: { catalogServiceType: 'INFORMATION' },
    });

    const published = await publication.publish({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actorIdentityId: ctx.identityId,
      targetPublicAvailability: 'INFORMATION_ONLY',
    });

    expect(published.newPublicAvailability).toBe('INFORMATION_ONLY');
    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.maturityStatus).not.toBe(GovernmentServiceMaturityStatus.ACTIVE);
  });

  it('enforces readiness gating across technical, institutional, and operational layers', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const service = await fixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const initial = await readiness.assessReadiness(service.governmentServiceVersionId);
    expect(initial.technicallyReady).toBe(true);
    expect(initial.institutionallyAccepted).toBe(false);

    const blockedOperational = await activation.activateOperationally({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: {
        identityId: ctx.identityId,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        appointmentId: ctx.appointmentId,
      },
    });
    expect(blockedOperational.outcome).toBe(ServiceActivationOutcome.REQUIRES_READINESS);

    const accepted = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: {
        identityId: ctx.identityId,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        appointmentId: ctx.appointmentId,
      },
    });
    expect(accepted.outcome).toBe(ServiceActivationOutcome.ACTIVATED);

    const afterAcceptance = await readiness.assessReadiness(service.governmentServiceVersionId);
    expect(afterAcceptance.achievedLevel).toBe(ServiceReadinessLevel.INSTITUTIONALLY_ACCEPTED);
  });
});
