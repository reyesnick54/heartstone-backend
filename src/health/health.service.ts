import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  APP_CONFIG,
  type AppConfig,
  IDENTITY_CONFIG,
  type IdentityConfig,
  OIDC_CONFIG,
  type OidcConfig,
} from '../config/config.constants';
import { PrismaService } from '../database/prisma.service';
import { DocumentTrustProductionGateService } from '../document-trust/services/document-trust-production-gate.service';
import { RedisService } from '../redis/redis.service';

export interface ReadinessCheckResult {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    identityAuth: 'ready' | 'not_ready';
    documentTrust: 'ready' | 'not_ready';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly documentTrustGate: DocumentTrustProductionGateService,
  ) {}

  async checkReadiness(): Promise<ReadinessCheckResult> {
    const [databaseUp, redisUp] = await Promise.all([
      this.prismaService.isHealthy(),
      this.checkRedis(),
    ]);

    const identityAuthReady = this.checkIdentityAuthReadiness();
    const documentTrustReady = this.checkDocumentTrustReadiness();

    return {
      status:
        databaseUp && redisUp && identityAuthReady && documentTrustReady ? 'ready' : 'not_ready',
      checks: {
        database: databaseUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
        identityAuth: identityAuthReady ? 'ready' : 'not_ready',
        documentTrust: documentTrustReady ? 'ready' : 'not_ready',
      },
    };
  }

  private checkDocumentTrustReadiness(): boolean {
    const appConfig = this.configService.get<AppConfig>(APP_CONFIG);
    const nodeEnv = appConfig?.nodeEnv ?? 'development';
    if (nodeEnv !== 'production') {
      return true;
    }

    return this.documentTrustGate.evaluateProhibitedAdapters().allowed;
  }

  private checkIdentityAuthReadiness(): boolean {
    const appConfig = this.configService.get<AppConfig>(APP_CONFIG);
    const identityConfig = this.configService.get<IdentityConfig>(IDENTITY_CONFIG);
    const oidcConfig = this.configService.get<OidcConfig>(OIDC_CONFIG);
    const nodeEnv = appConfig?.nodeEnv ?? 'development';

    if (nodeEnv !== 'production') {
      return true;
    }

    const providers = oidcConfig?.providers ?? [];
    const oidcOk = oidcConfig?.enabled === true && providers.length > 0;
    const passwordDisabled = identityConfig?.localPasswordAuthEnabled !== true;
    const pepperOk = Boolean(identityConfig?.serviceCredentialPepper);

    return oidcOk && passwordDisabled && pepperOk;
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redisService.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
