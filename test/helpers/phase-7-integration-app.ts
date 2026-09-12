import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import { type App } from 'supertest/types';

import { ApplicationProcessingModule } from '../../src/application-processing/application-processing.module';
import { createPinoConfig } from '../../src/common/logging/pino-config';
import appConfig from '../../src/config/app.config';
import { envValidationSchema } from '../../src/config/env.validation';
import identityConfig from '../../src/config/identity.config';
import redisConfig from '../../src/config/redis.config';
import securityConfig from '../../src/config/security.config';
import { configureApplication } from '../../src/bootstrap/configure-application';
import { DatabaseModule } from '../../src/database/database.module';
import { PrismaService } from '../../src/database/prisma.service';
import { EvidenceRecordsModule } from '../../src/evidence-records/evidence-records.module';
import { GovernmentModule } from '../../src/government/government.module';
import { IdentityModule } from '../../src/identity/identity.module';
import { RedisModule } from '../../src/redis/redis.module';
import { ServiceCatalogModule } from '../../src/service-catalog/service-catalog.module';
import { overrideRedisService } from '../redis-test-utils';
import { resetApplicationProcessingData } from './application-processing-test-reset';
import { resetAuthorityData } from './authority-test-reset';
import { resetEvidenceRecordsData } from './evidence-records-test-reset';
import { resetServiceCatalogData } from './service-catalog-test-reset';

export async function createPhase7IntegrationApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env'],
        load: [appConfig, redisConfig, securityConfig, identityConfig],
        validationSchema: envValidationSchema,
        validationOptions: { abortEarly: true },
      }),
      LoggerModule.forRoot(createPinoConfig()),
      DatabaseModule,
      RedisModule,
      GovernmentModule,
      IdentityModule,
      ServiceCatalogModule,
      ApplicationProcessingModule,
      EvidenceRecordsModule,
    ],
  });

  overrideRedisService(moduleBuilder);

  const moduleFixture: TestingModule = await moduleBuilder.compile();
  const app: INestApplication<App> = moduleFixture.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

async function resetIdentityData(prisma: PrismaService): Promise<void> {
  await prisma.securityAuditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.identityOfficeholderLink.deleteMany();
  await prisma.representativeAuthority.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.authenticationMethod.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.identity.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.person.deleteMany();
  await prisma.organization.deleteMany();
}

async function resetGovernmentData(prisma: PrismaService): Promise<void> {
  await resetEvidenceRecordsData(prisma);
  await resetApplicationProcessingData(prisma);
  await resetServiceCatalogData(prisma);
  await resetAuthorityData(prisma);
  await prisma.delegationStructuredScope.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.institutionExternalAuthority.deleteMany();
  await prisma.office.deleteMany();
  await prisma.identityOfficeholderLink.deleteMany();
  await prisma.officeholder.deleteMany();
  await prisma.department.deleteMany();
  await prisma.governmentBody.deleteMany();
  await prisma.externalAuthority.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.jurisdiction.deleteMany();
}

export async function resetAllTestData(prisma: PrismaService): Promise<void> {
  await resetEvidenceRecordsData(prisma);
  await resetApplicationProcessingData(prisma);
  await resetServiceCatalogData(prisma);
  await resetAuthorityData(prisma);
  await resetIdentityData(prisma);
  await resetGovernmentData(prisma);
}
