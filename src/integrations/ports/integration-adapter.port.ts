import { type IntegrationOperation } from '@prisma/client';

export const INTEGRATION_ADAPTER_PORT = Symbol('INTEGRATION_ADAPTER_PORT');

export interface IntegrationAdapterCapabilities {
  supportedOperations: IntegrationOperation[];
  supportsIdempotency: boolean;
  supportsWrite: boolean;
  supportsUpdate: boolean;
  supportsWebhooks: boolean;
  supportsHealthCheck: boolean;
}

export interface IntegrationAdapterQueryInput {
  correlationId: string;
  fields: Record<string, unknown>;
  schemaVersion: string;
}

export interface IntegrationAdapterSubmitInput {
  correlationId: string;
  idempotencyKey: string;
  fields: Record<string, unknown>;
  schemaVersion: string;
}

export interface IntegrationAdapterUpdateInput {
  correlationId: string;
  idempotencyKey: string;
  fields: Record<string, unknown>;
  schemaVersion: string;
  referenceId: string;
}

export interface IntegrationAdapterSendEventInput {
  correlationId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface IntegrationAdapterReceiveEventInput {
  externalEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signature?: string;
  timestamp?: string;
}

export interface IntegrationAdapterHealthCheckResult {
  healthy: boolean;
  details?: Record<string, unknown>;
}

export interface IntegrationAdapterResponse {
  success: boolean;
  httpStatusCode?: number;
  data?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  endpointReference?: string;
  sourceReference?: string;
  signatureValid?: boolean;
  schemaVersion?: string;
  timedOut?: boolean;
}

export interface IntegrationAdapterPort {
  readonly adapterType: string;
  readonly capabilities: IntegrationAdapterCapabilities;

  query?(input: IntegrationAdapterQueryInput): Promise<IntegrationAdapterResponse>;
  submit?(input: IntegrationAdapterSubmitInput): Promise<IntegrationAdapterResponse>;
  update?(input: IntegrationAdapterUpdateInput): Promise<IntegrationAdapterResponse>;
  sendEvent?(input: IntegrationAdapterSendEventInput): Promise<IntegrationAdapterResponse>;
  receiveEvent?(input: IntegrationAdapterReceiveEventInput): Promise<IntegrationAdapterResponse>;
  healthCheck?(): Promise<IntegrationAdapterHealthCheckResult>;
}
