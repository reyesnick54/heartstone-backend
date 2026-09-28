import { Injectable } from '@nestjs/common';

import {
  type AiModelPort,
  type AiModelRequest,
  type AiModelResponse,
} from '../ports/ai-model.port';

@Injectable()
export class DeterministicGovernedAiAdapter implements AiModelPort {
  readonly providerName = 'deterministic-governed';
  readonly isProductionAdapter = true;
  readonly isExternallyConnected = false;

  complete(request: AiModelRequest): Promise<AiModelResponse> {
    return Promise.resolve({
      rawOutput: JSON.stringify({
        disposition: 'REVIEW_REQUIRED',
        correlationId: request.correlationId,
        summary: 'Deterministic governed-AI adapter — recommendatory output only.',
        isOfficialDecision: false,
      }),
      usageMetadata: { adapter: this.providerName },
      isBinding: false,
      confidence: 0,
    });
  }
}
