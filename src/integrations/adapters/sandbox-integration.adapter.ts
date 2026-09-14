import { Injectable } from '@nestjs/common';
import { IntegrationOperation } from '@prisma/client';

import { SANDBOX_ADAPTER_TYPE } from '../integrations.constants';
import {
  type IntegrationAdapterCapabilities,
  type IntegrationAdapterHealthCheckResult,
  type IntegrationAdapterPort,
  type IntegrationAdapterQueryInput,
  type IntegrationAdapterReceiveEventInput,
  type IntegrationAdapterResponse,
  type IntegrationAdapterSendEventInput,
  type IntegrationAdapterSubmitInput,
} from '../ports/integration-adapter.port';

export interface SandboxAdapterConfig {
  simulateTimeout?: boolean;
  simulateFailure?: boolean;
  simulateInvalidSignature?: boolean;
  simulateHttp200InvalidSchema?: boolean;
  responseData?: Record<string, unknown>;
  acceptedEventTypes?: string[];
  webhookSigningSecret?: string;
}

@Injectable()
export class SandboxIntegrationAdapter implements IntegrationAdapterPort {
  readonly adapterType = SANDBOX_ADAPTER_TYPE;
  readonly capabilities: IntegrationAdapterCapabilities = {
    supportedOperations: [
      IntegrationOperation.QUERY,
      IntegrationOperation.SUBMIT,
      IntegrationOperation.SEND_EVENT,
      IntegrationOperation.RECEIVE_EVENT,
      IntegrationOperation.HEALTH_CHECK,
    ],
    supportsIdempotency: true,
    supportsWrite: true,
    supportsUpdate: false,
    supportsWebhooks: true,
    supportsHealthCheck: true,
  };

  private config: SandboxAdapterConfig = {};

  setConfig(config: SandboxAdapterConfig): void {
    this.config = config;
  }

  resetConfig(): void {
    this.config = {};
  }

  async query(input: IntegrationAdapterQueryInput): Promise<IntegrationAdapterResponse> {
    const data = this.config.responseData ?? {
      referenceId: input.fields.referenceId,
      status: 'sandbox-acknowledged',
      schemaVersion: input.schemaVersion,
    };
    return this.executeWithSimulation({
      correlationId: input.correlationId,
      data,
    });
  }

  async submit(input: IntegrationAdapterSubmitInput): Promise<IntegrationAdapterResponse> {
    return this.executeWithSimulation({
      correlationId: input.correlationId,
      data: {
        submissionId: `sandbox-${input.idempotencyKey}`,
        status: 'received',
        schemaVersion: input.schemaVersion,
        ...this.config.responseData,
      },
    });
  }

  async sendEvent(input: IntegrationAdapterSendEventInput): Promise<IntegrationAdapterResponse> {
    return this.executeWithSimulation({
      correlationId: input.correlationId,
      data: {
        eventAccepted: true,
        eventType: input.eventType,
      },
    });
  }

  receiveEvent(input: IntegrationAdapterReceiveEventInput): Promise<IntegrationAdapterResponse> {
    if (this.config.simulateInvalidSignature) {
      return Promise.resolve({
        success: false,
        signatureValid: false,
        errorCode: 'INVALID_SIGNATURE',
        errorMessage: 'Sandbox: signature validation failed',
      });
    }

    const acceptedTypes = this.config.acceptedEventTypes ?? ['status.update', 'acknowledgment'];
    if (!acceptedTypes.includes(input.eventType)) {
      return Promise.resolve({
        success: false,
        errorCode: 'UNEXPECTED_EVENT_TYPE',
        errorMessage: `Sandbox: event type "${input.eventType}" not accepted`,
      });
    }

    return Promise.resolve({
      success: true,
      signatureValid: true,
      data: {
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        payload: input.payload,
      },
      endpointReference: 'sandbox://inbound',
      sourceReference: 'sandbox-adapter',
    });
  }

  healthCheck(): Promise<IntegrationAdapterHealthCheckResult> {
    if (this.config.simulateFailure) {
      return Promise.resolve({ healthy: false, details: { reason: 'sandbox-simulated-failure' } });
    }
    return Promise.resolve({ healthy: true, details: { adapter: SANDBOX_ADAPTER_TYPE } });
  }

  private executeWithSimulation(params: {
    correlationId: string;
    data: Record<string, unknown>;
  }): Promise<IntegrationAdapterResponse> {
    if (this.config.simulateTimeout) {
      return Promise.resolve({
        success: false,
        timedOut: true,
        errorCode: 'TIMEOUT',
        errorMessage: 'Sandbox: simulated timeout',
      });
    }

    if (this.config.simulateFailure) {
      return Promise.resolve({
        success: false,
        httpStatusCode: 503,
        errorCode: 'EXTERNAL_FAILURE',
        errorMessage: 'Sandbox: simulated external failure',
      });
    }

    if (this.config.simulateHttp200InvalidSchema) {
      return Promise.resolve({
        success: true,
        httpStatusCode: 200,
        data: { invalidField: 'schema-mismatch', missingRequired: undefined },
        schemaVersion: 'mismatched-version',
        endpointReference: 'sandbox://outbound',
        sourceReference: 'sandbox-adapter',
      });
    }

    const schemaVersion =
      typeof params.data.schemaVersion === 'string' ? params.data.schemaVersion : '1.0';

    return Promise.resolve({
      success: true,
      httpStatusCode: 200,
      data: params.data,
      schemaVersion,
      endpointReference: 'sandbox://outbound',
      sourceReference: 'sandbox-adapter',
      signatureValid: true,
    });
  }

  update(): Promise<IntegrationAdapterResponse> {
    return Promise.resolve({
      success: false,
      errorCode: 'OPERATION_NOT_SUPPORTED',
      errorMessage: 'Sandbox adapter does not support update operations',
    });
  }
}
