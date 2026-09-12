import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import { type App } from 'supertest/types';

import { ApplicationProcessingModule } from '../../src/application-processing/application-processing.module';
import { configureApplication } from '../../src/bootstrap/configure-application';
import { createPinoConfig } from '../../src/common/logging/pino-config';
import appConfig from '../../src/config/app.config';
import { envValidationSchema } from '../../src/config/env.validation';
import identityConfig from '../../src/config/identity.config';
import redisConfig from '../../src/config/redis.config';
import securityConfig from '../../src/config/security.config';
import { DatabaseModule } from '../../src/database/database.module';
import { PrismaService } from '../../src/database/prisma.service';
import { EvidenceRecordsModule } from '../../src/evidence-records/evidence-records.module';
import { GovernmentModule } from '../../src/government/government.module';
import { IdentityModule } from '../../src/identity/identity.module';
import { RedisModule } from '../../src/redis/redis.module';
import { ServiceCatalogModule } from '../../src/service-catalog/service-catalog.module';
import { overrideRedisService } from '../redis-test-utils';
import { resetAllTestData, resetIdentityData } from './integration-app';

export { resetAllTestData, resetIdentityData };

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
