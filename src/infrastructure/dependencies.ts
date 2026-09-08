import { createDatabaseProbe } from './database';
import { createRedisProbe } from './redis';
import type { AppDependencies } from './types';

export interface RuntimeConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionTimeoutMs: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    connectionTimeoutMs: number;
  };
}

export function createProductionDependencies(config: RuntimeConfig): AppDependencies {
  return {
    database: createDatabaseProbe(config.database),
    redis: createRedisProbe(config.redis),
  };
}
