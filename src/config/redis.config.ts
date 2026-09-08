import { registerAs } from '@nestjs/config';

export const REDIS_CONFIG_KEY = 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

export default registerAs(REDIS_CONFIG_KEY, (): RedisConfig => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: emptyToUndefined(process.env.REDIS_PASSWORD),
  db: Number(process.env.REDIS_DB ?? 0),
}));
