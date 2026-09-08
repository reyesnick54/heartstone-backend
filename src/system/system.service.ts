import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_CONFIG, AppConfig } from '../config/config.constants';
import { VersionResponseDto } from './dto/system-response.dto';

@Injectable()
export class SystemService {
  constructor(private readonly configService: ConfigService) {}

  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  getReady(): { status: string } {
    return { status: 'ready' };
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
