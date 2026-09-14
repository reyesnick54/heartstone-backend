import { Injectable, NotFoundException } from '@nestjs/common';

import { SandboxIntegrationAdapter } from '../adapters/sandbox-integration.adapter';
import { TestIntegrationAdapter } from '../adapters/test-integration.adapter';
import { INTEGRATIONS_EXPLANATION_CODES } from '../integrations.constants';
import { type IntegrationAdapterPort } from '../ports/integration-adapter.port';

@Injectable()
export class IntegrationAdapterRegistryService {
  private readonly adapters = new Map<string, IntegrationAdapterPort>();

  constructor(
    private readonly sandboxAdapter: SandboxIntegrationAdapter,
    private readonly testAdapter: TestIntegrationAdapter,
  ) {
    this.register(this.sandboxAdapter);
    this.register(this.testAdapter);
  }

  register(adapter: IntegrationAdapterPort): void {
    this.adapters.set(adapter.adapterType, adapter);
  }

  resolve(adapterType: string): IntegrationAdapterPort {
    const adapter = this.adapters.get(adapterType);
    if (!adapter) {
      throw new NotFoundException({
        message: `No adapter registered for type "${adapterType}"`,
        code: INTEGRATIONS_EXPLANATION_CODES.ADAPTER_NOT_FOUND,
      });
    }
    return adapter;
  }

  getSandboxAdapter(): SandboxIntegrationAdapter {
    return this.sandboxAdapter;
  }

  getTestAdapter(): TestIntegrationAdapter {
    return this.testAdapter;
  }
}
