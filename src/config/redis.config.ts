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

/** Parses redis:// or rediss:// URLs, as issued by managed Redis-compatible services. */
export function parseRedisUrl(url: string): RedisConfig {
  const parsed = new URL(url);
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use the redis:// or rediss:// scheme');
  }
  const dbSegment = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: emptyToUndefined(decodeURIComponent(parsed.password)),
    db: dbSegment ? Number(dbSegment) : 0,
  };
}

export default registerAs(REDIS_CONFIG_KEY, (): RedisConfig => {
  const url = emptyToUndefined(process.env.REDIS_URL);
  if (url) {
    return parseRedisUrl(url);
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: emptyToUndefined(process.env.REDIS_PASSWORD),
    db: Number(process.env.REDIS_DB ?? 0),
  };
});
