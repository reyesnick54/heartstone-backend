import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { createPinoConfig } from './common/logging/pino-config';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import redisConfig from './config/redis.config';
import securityConfig from './config/security.config';
import { DatabaseModule } from './database/database.module';
import { DepartmentModule } from './department/department.module';
import { GovernmentBodyModule } from './government-body/government-body.module';
import { HealthModule } from './health/health.module';
import { InstitutionModule } from './institution/institution.module';
import { JurisdictionModule } from './jurisdiction/jurisdiction.module';
import { RedisModule } from './redis/redis.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, redisConfig, securityConfig],
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
    JurisdictionModule,
    InstitutionModule,
    GovernmentBodyModule,
    DepartmentModule,
  ],
})
export class AppModule {}
