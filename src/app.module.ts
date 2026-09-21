import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { ApplicationProcessingModule } from './application-processing/application-processing.module';
import { AuthorityModule } from './authority/authority.module';
import { CitizenExperienceModule } from './citizen-experience/citizen-experience.module';
import { createPinoConfig } from './common/logging/pino-config';
import { ComplianceModule } from './compliance/compliance.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import identityConfig from './config/identity.config';
import redisConfig from './config/redis.config';
import securityConfig from './config/security.config';
import { DatabaseModule } from './database/database.module';
import { DecisionsModule } from './decisions/decisions.module';
import { DecisionsIssuanceModule } from './decisions-issuance/decisions-issuance.module';
import { EvidenceModule } from './evidence/evidence.module';
import { EvidenceRecordsModule } from './evidence-records/evidence-records.module';
import { ExperienceModule } from './experience/experience.module';
import { GovernmentModule } from './government/government.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { OperationalReadinessModule } from './operational-readiness/operational-readiness.module';
import { OperationalSupportModule } from './operational-support/operational-support.module';
import { ProductionReadinessModule } from './production-readiness/production-readiness.module';
import { RecordsModule } from './records/records.module';
import { RedisModule } from './redis/redis.module';
import { RedressModule } from './redress/redress.module';
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
    ExperienceModule,
    ApplicationProcessingModule,
    CitizenExperienceModule,
    RecordsModule,
    EvidenceRecordsModule,
    EvidenceModule,
    InstrumentsModule,
    DecisionsModule,
    DecisionsIssuanceModule,
    ComplianceModule,
    RedressModule,
    IntelligenceModule,
    OperationalSupportModule,
    OperationalReadinessModule,
    ProductionReadinessModule,
  ],
})
export class AppModule {}
