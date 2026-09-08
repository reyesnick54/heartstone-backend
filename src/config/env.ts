export interface RuntimeConfig {
  host: string;
  port: number;
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

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsed;
}

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: readNumber(process.env.PORT, 3000),
    database: {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: readNumber(process.env.DATABASE_PORT, 5432),
      database: process.env.DATABASE_NAME ?? 'heartstone',
      user: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      connectionTimeoutMs: readNumber(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 2000),
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: readNumber(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD,
      connectionTimeoutMs: readNumber(process.env.REDIS_CONNECTION_TIMEOUT_MS, 2000),
    },
  };
}
