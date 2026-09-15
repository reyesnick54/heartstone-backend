import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export interface CorrelationContext {
  correlationId: string;
  workflowId?: string;
  integrationId?: string;
  notificationId?: string;
  paymentId?: string;
  backgroundJobId?: string;
}

@Injectable()
export class CorrelationIdService {
  private readonly storage = new AsyncLocalStorage<CorrelationContext>();

  runWithContext<T>(context: CorrelationContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  getContext(): CorrelationContext | undefined {
    return this.storage.getStore();
  }

  getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  resolveIncomingId(headerValue?: string | string[]): string {
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }
    if (Array.isArray(headerValue)) {
      const first = headerValue[0];
      if (first && first.trim().length > 0) {
        return first.trim();
      }
    }
    return randomUUID();
  }

  propagateToChild(overrides: Partial<CorrelationContext> = {}): CorrelationContext {
    const current = this.storage.getStore();
    const correlationId = current?.correlationId ?? randomUUID();
    return {
      correlationId,
      workflowId: overrides.workflowId ?? current?.workflowId,
      integrationId: overrides.integrationId ?? current?.integrationId,
      notificationId: overrides.notificationId ?? current?.notificationId,
      paymentId: overrides.paymentId ?? current?.paymentId,
      backgroundJobId: overrides.backgroundJobId ?? current?.backgroundJobId,
    };
  }
}
