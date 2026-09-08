import Redis from 'ioredis';
import type { DependencyCheckResult, HealthProbe } from './types';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  connectionTimeoutMs: number;
}

export class RedisHealthProbe implements HealthProbe {
  constructor(private readonly config: RedisConfig) {}

  async check(): Promise<DependencyCheckResult> {
    try {
      const client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        connectTimeout: this.config.connectionTimeoutMs,
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
      });

      await client.connect();
      const pong = await client.ping();
      await client.quit();

      if (pong !== 'PONG') {
        return { status: 'error', message: `Unexpected Redis ping response: ${pong}` };
      }

      return { status: 'ok' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      return { status: 'error', message };
    }
  }
}

export function createRedisProbe(config: RedisConfig): HealthProbe {
  return new RedisHealthProbe(config);
}
