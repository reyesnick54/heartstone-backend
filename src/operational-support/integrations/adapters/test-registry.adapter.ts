import { Injectable } from '@nestjs/common';

import {
  assertRegistryResponseSchema,
  RegistryAdapterPort,
  RegistryQueryInput,
  RegistryQueryResult,
} from '../integration.types';

@Injectable()
export class TestRegistryAdapter implements RegistryAdapterPort {
  readonly externalSystemCode = 'TEST_GOVERNMENT_REGISTRY';

  query(input: RegistryQueryInput): Promise<RegistryQueryResult> {
    const result: RegistryQueryResult = {
      identifier: input.identifier,
      identifierType: input.identifierType ?? 'NATIONAL_ID',
      status: 'REGISTERED',
      registeredName: `Test Registry Holder ${input.identifier}`,
      lastUpdatedAt: new Date().toISOString(),
      attributes: {
        source: this.externalSystemCode,
        queryReference: input.queryReference,
      },
    };

    this.validateResponse(result);
    return Promise.resolve(result);
  }

  validateResponse(payload: RegistryQueryResult): void {
    assertRegistryResponseSchema(payload);
  }
}
