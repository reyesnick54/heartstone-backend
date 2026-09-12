import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { ApplicationsModule } from './applications/applications.module';
import { ApplicationsWorkflowModule } from './applications-workflow/applications-workflow.module';
import { ApplicationProcessingModule } from './application-processing/application-processing.module';
import { AuthorityModule } from './authority/authority.module';
import { CasesModule } from './cases/cases.module';
import { createPinoConfig } from './common/logging/pino-config';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import identityConfig from './config/identity.config';
import redisConfig from './config/redis.config';
import securityConfig from './config/security.config';
import { DatabaseModule } from './database/database.module';
import { GovernmentModule } from './government/government.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { RedisModule } from './redis/redis.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, redisConfig, securityConfig, identityConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    LoggerModule.forRoot(createPinoConfig()),
    DatabaseModule,
    RedisModule,
    HealthModule,
    SystemModule,
    GovernmentModule,
    IdentityModule,
    AuthorityModule,
    ServiceCatalogModule,
    ApplicationsModule,
    CasesModule,
    ApplicationsWorkflowModule,
    ApplicationProcessingModule,
  ],
})
export class AppModule {}
