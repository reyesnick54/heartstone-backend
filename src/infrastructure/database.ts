import pg from 'pg';
import type { DependencyCheckResult, HealthProbe } from './types';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionTimeoutMs: number;
}

export class PostgresHealthProbe implements HealthProbe {
  constructor(private readonly config: DatabaseConfig) {}

  async check(): Promise<DependencyCheckResult> {
    try {
      const client = new pg.Client({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      return { status: 'ok' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return { status: 'error', message };
    }
  }
}

export function createDatabaseProbe(config: DatabaseConfig): HealthProbe {
  return new PostgresHealthProbe(config);
}
