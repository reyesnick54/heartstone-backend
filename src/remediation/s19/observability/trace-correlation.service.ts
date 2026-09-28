import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export interface TraceCorrelationContext {
  correlationId: string;
  spans: string[];
}

@Injectable()
export class TraceCorrelationService {
  private readonly storage = new AsyncLocalStorage<TraceCorrelationContext>();

  runWithCorrelation<T>(correlationId: string, fn: () => T): T {
    const context: TraceCorrelationContext = {
      correlationId,
      spans: [],
    };
    return this.storage.run(context, fn);
  }

  startSpan(component: string): void {
    const context = this.storage.getStore();
    if (!context) {
      return;
    }
    context.spans.push(component);
  }

  getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  getSpanTrail(): string[] {
    return [...(this.storage.getStore()?.spans ?? [])];
  }

  createCorrelationId(): string {
    return randomUUID();
  }
}
