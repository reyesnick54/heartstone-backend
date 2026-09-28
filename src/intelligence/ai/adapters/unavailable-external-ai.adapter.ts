import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { GOVERNED_AI_READINESS_CODES } from '../governed-ai.constants';
import { type AiModelPort, type AiModelResponse } from '../ports/ai-model.port';

@Injectable()
export class UnavailableExternalAiAdapter implements AiModelPort {
  readonly providerName = 'external-unavailable';
  readonly isProductionAdapter = false;
  readonly isExternallyConnected = false;

  complete(): Promise<AiModelResponse> {
    throw new ServiceUnavailableException({
      code: GOVERNED_AI_READINESS_CODES.EXTERNAL_PROVIDER_NOT_CONFIGURED,
      message: 'External AI provider is not approved or configured for this environment.',
    });
  }
}
