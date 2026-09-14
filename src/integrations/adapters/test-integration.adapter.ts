import { Injectable } from '@nestjs/common';
import { IntegrationOperation } from '@prisma/client';

import { TEST_ADAPTER_TYPE } from '../integrations.constants';
import {
  type IntegrationAdapterCapabilities,
  type IntegrationAdapterHealthCheckResult,
  type IntegrationAdapterPort,
  type IntegrationAdapterQueryInput,
  type IntegrationAdapterResponse,
} from '../ports/integration-adapter.port';

@Injectable()
export class TestIntegrationAdapter implements IntegrationAdapterPort {
  readonly adapterType = TEST_ADAPTER_TYPE;
  readonly capabilities: IntegrationAdapterCapabilities = {
    supportedOperations: [IntegrationOperation.QUERY, IntegrationOperation.HEALTH_CHECK],
    supportsIdempotency: false,
    supportsWrite: false,
    supportsUpdate: false,
    supportsWebhooks: false,
    supportsHealthCheck: true,
  };

  private readonly idempotentResponses = new Map<string, IntegrationAdapterResponse>();

  reset(): void {
    this.idempotentResponses.clear();
  }

  query(input: IntegrationAdapterQueryInput): Promise<IntegrationAdapterResponse> {
    const key = input.correlationId;
    const cached = this.idempotentResponses.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    const response: IntegrationAdapterResponse = {
      success: true,
      httpStatusCode: 200,
      data: {
        referenceId: input.fields.referenceId,
        result: 'test-query-result',
      },
      schemaVersion: input.schemaVersion,
      endpointReference: 'test://query',
      sourceReference: 'test-adapter',
      signatureValid: true,
    };
    this.idempotentResponses.set(key, response);
    return Promise.resolve(response);
  }

  submit(): Promise<IntegrationAdapterResponse> {
    return Promise.resolve({
      success: false,
      errorCode: 'OPERATION_NOT_SUPPORTED',
      errorMessage: 'Test adapter is read-only',
    });
  }

  healthCheck(): Promise<IntegrationAdapterHealthCheckResult> {
    return Promise.resolve({ healthy: true, details: { adapter: TEST_ADAPTER_TYPE } });
  }
}
