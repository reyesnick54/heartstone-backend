import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { ApplicationProcessingModule } from './application-processing/application-processing.module';
import { AuthorityModule } from './authority/authority.module';
import { CitizenExperienceModule } from './citizen-experience/citizen-experience.module';
import { CivilRegistryModule } from './civil-registry/civil-registry.module';
import { createPinoConfig } from './common/logging/pino-config';
import { ComplianceModule } from './compliance/compliance.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import identityConfig from './config/identity.config';
import redisConfig from './config/redis.config';
import securityConfig from './config/security.config';
import { CorporateRegistryModule } from './corporate-registry/corporate-registry.module';
import { CustomsTradeModule } from './customs-trade/customs-trade.module';
import { DatabaseModule } from './database/database.module';
import { DecisionsModule } from './decisions/decisions.module';
import { DecisionsIssuanceModule } from './decisions-issuance/decisions-issuance.module';
import { EducationModule } from './education/education.module';
import { EvidenceModule } from './evidence/evidence.module';
import { EvidenceRecordsModule } from './evidence-records/evidence-records.module';
import { ExperienceModule } from './experience/experience.module';
import { GovernmentModule } from './government/government.module';
import { HealthModule } from './health/health.module';
import { HealthcareModule } from './healthcare/healthcare.module';
import { IdentityModule } from './identity/identity.module';
import { ImmigrationModule } from './immigration/immigration.module';
import { InstitutionalScopeModule } from './institutional-scope/institutional-scope.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { LabourModule } from './labour/labour.module';
import { OperationalReadinessModule } from './operational-readiness/operational-readiness.module';
import { OperationalSupportModule } from './operational-support/operational-support.module';
import { PlanningConstructionModule } from './planning-construction/planning-construction.module';
import { ProductionReadinessModule } from './production-readiness/production-readiness.module';
import { PropertyRegistryModule } from './property-registry/property-registry.module';
import { PublicSafetyModule } from './public-safety/public-safety.module';
import { RecordsModule } from './records/records.module';
import { RedisModule } from './redis/redis.module';
import { RedressModule } from './redress/redress.module';
import { RevenueModule } from './revenue/revenue.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { SecurityModule } from './security/security.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { ServicePacksModule } from './service-packs/service-packs.module';
import { SocialProtectionModule } from './social-protection/social-protection.module';
import { SystemModule } from './system/system.module';
import { TransportationModule } from './transportation/transportation.module';

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
    SecurityModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    HealthcareModule,
    SystemModule,
    GovernmentModule,
    IdentityModule,
    InstitutionalScopeModule,
    AuthorityModule,
    ServiceCatalogModule,
    SchedulingModule,
    CivilRegistryModule,
    PropertyRegistryModule,
    ServicePacksModule,
    ExperienceModule,
    ApplicationProcessingModule,
    ImmigrationModule,
    LabourModule,
    EducationModule,
    SocialProtectionModule,
    TransportationModule,
    CitizenExperienceModule,
    CivilRegistryModule,
    RecordsModule,
    EvidenceRecordsModule,
    EvidenceModule,
    InstrumentsModule,
    DecisionsModule,
    DecisionsIssuanceModule,
    ComplianceModule,
    CorporateRegistryModule,
    CustomsTradeModule,
    RedressModule,
    RevenueModule,
    PropertyRegistryModule,
    PlanningConstructionModule,
    PublicSafetyModule,
    IntelligenceModule,
    OperationalSupportModule,
    OperationalReadinessModule,
    ProductionReadinessModule,
  ],
})
export class AppModule {}
