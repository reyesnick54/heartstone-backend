import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { APP_CONFIG, AppConfig } from '../config/config.constants';
import { HealthService, ReadinessCheckResult } from '../health/health.service';
import { VersionResponseDto } from './dto/system-response.dto';

@Injectable()
export class SystemService {
  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: HealthService,
  ) {}

  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  async getReady(): Promise<ReadinessCheckResult> {
    return this.healthService.checkReadiness();
  }

  getVersion(): VersionResponseDto {
    const appConfig = this.configService.getOrThrow<AppConfig>(APP_CONFIG);

    return {
      name: appConfig.name,
      apiVersion: appConfig.apiVersion,
      environment: appConfig.nodeEnv,
      build: appConfig.buildVersion,
    };
  }
}
