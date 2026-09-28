export const AI_MODEL_PORT = Symbol('AI_MODEL_PORT');

export interface AiModelRequest {
  correlationId: string;
  providerCode: string;
  modelIdentifier: string;
  modelVersionLabel: string;
  instructions: string;
  timeoutMs?: number;
}

export interface AiModelResponse {
  rawOutput: string;
  usageMetadata?: Record<string, unknown>;
  providerReference?: string;
  isBinding: false;
  confidence: number;
}

export interface AiModelPort {
  readonly providerName: string;
  readonly isProductionAdapter: boolean;
  readonly isExternallyConnected: boolean;

  complete(request: AiModelRequest): Promise<AiModelResponse>;
}
