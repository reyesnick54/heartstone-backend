import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { APP_CONFIG, type AppConfig } from '../../../config/config.constants';
import { enforcesProductionProviderGates } from '../../../config/deployment-tier';
import { type GovernedAiConfig } from '../config/governed-ai.config';
import { GOVERNED_AI_CONFIG_KEY, GOVERNED_AI_READINESS_CODES } from '../governed-ai.constants';
import { AI_MODEL_PORT, type AiModelPort } from '../ports/ai-model.port';

export interface GovernedAiProductionGateResult {
  allowed: boolean;
  reasons: string[];
  externalProviderEnabled: boolean;
}

@Injectable()
export class GovernedAiProductionGateService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @Inject(AI_MODEL_PORT) private readonly modelPort: AiModelPort,
  ) {}

  onModuleInit(): void {
    const app = this.configService.get<AppConfig>(APP_CONFIG);
    if (!app || !enforcesProductionProviderGates(app)) {
      // Staging keeps production security but may run sandbox providers (reported test-only).
      return;
    }

    const evaluation = this.evaluateExternalAdapter();
    if (!evaluation.allowed && this.getConfig().externalProviderEnabled) {
      throw new Error(`Governed AI production gate failed: ${evaluation.reasons.join('; ')}`);
    }
  }

  getConfig(): GovernedAiConfig {
    return this.configService.getOrThrow<GovernedAiConfig>(GOVERNED_AI_CONFIG_KEY);
  }

  evaluateExternalAdapter(): GovernedAiProductionGateResult {
    const config = this.getConfig();
    const reasons: string[] = [];

    if (config.externalProviderEnabled) {
      if (!config.externalProviderCode) {
        reasons.push(GOVERNED_AI_READINESS_CODES.EXTERNAL_PROVIDER_NOT_APPROVED);
      }
      if (!config.externalProviderSecretEnvKey) {
        reasons.push(GOVERNED_AI_READINESS_CODES.EXTERNAL_PROVIDER_NOT_CONFIGURED);
      }
      if (!this.modelPort.isExternallyConnected || !this.modelPort.isProductionAdapter) {
        reasons.push(GOVERNED_AI_READINESS_CODES.EXTERNAL_PROVIDER_NOT_CONFIGURED);
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      externalProviderEnabled: config.externalProviderEnabled,
    };
  }

  isExternalInvocationAllowed(): boolean {
    const config = this.getConfig();
    if (!config.externalProviderEnabled) {
      return false;
    }
    return this.evaluateExternalAdapter().allowed;
  }
}
