import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AppointmentsModule } from './appointments/appointments.module';
import { createPinoConfig } from './common/logging/pino-config';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import redisConfig from './config/redis.config';
import securityConfig from './config/security.config';
import { DatabaseModule } from './database/database.module';
import { DelegationModule } from './delegation/delegation.module';
import { GovernmentModule } from './government/government.module';
import { HealthModule } from './health/health.module';
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
    DelegationModule,
    AppointmentsModule,
    GovernmentModule,
  ],
})
export class AppModule {}
