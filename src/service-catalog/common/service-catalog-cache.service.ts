import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service';
import {
  PUBLIC_SERVICE_CACHE_PREFIX,
  PUBLIC_SERVICE_LIST_CACHE_TTL_SECONDS,
} from './public-discovery.constants';

@Injectable()
export class ServiceCatalogCacheService {
  private readonly logger = new Logger(ServiceCatalogCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async get<T>(cacheKey: string): Promise<T | null> {
    if (!this.redisService.isConnected()) {
      return null;
    }

    try {
      const raw = await this.redisService.getClient().get(cacheKey);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to read cache key ${cacheKey}: ${message}`);
      return null;
    }
  }

  async set(cacheKey: string, value: unknown, ttlSeconds = PUBLIC_SERVICE_LIST_CACHE_TTL_SECONDS): Promise<void> {
    if (!this.redisService.isConnected()) {
      return;
    }

    try {
      await this.redisService
        .getClient()
        .set(cacheKey, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write cache key ${cacheKey}: ${message}`);
    }
  }

  buildListCacheKey(queryHash: string): string {
    return `${PUBLIC_SERVICE_CACHE_PREFIX}:list:${queryHash}`;
  }

  buildDetailCacheKey(slug: string): string {
    return `${PUBLIC_SERVICE_CACHE_PREFIX}:detail:${slug}`;
  }

  buildStartPackageCacheKey(slug: string, serviceVersionId?: string): string {
    return serviceVersionId
      ? `${PUBLIC_SERVICE_CACHE_PREFIX}:start-package:${slug}:${serviceVersionId}`
      : `${PUBLIC_SERVICE_CACHE_PREFIX}:start-package:${slug}:current`;
  }

  buildFamiliesCacheKey(): string {
    return `${PUBLIC_SERVICE_CACHE_PREFIX}:families`;
  }

  async invalidateService(slug: string): Promise<void> {
    if (!this.redisService.isConnected()) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`${PUBLIC_SERVICE_CACHE_PREFIX}:*${slug}*`);
      const listKeys = await client.keys(`${PUBLIC_SERVICE_CACHE_PREFIX}:list:*`);
      const familyKeys = await client.keys(`${PUBLIC_SERVICE_CACHE_PREFIX}:families`);

      const allKeys = [...new Set([...keys, ...listKeys, ...familyKeys])];
      if (allKeys.length === 0) {
        return;
      }

      await client.del(...allKeys);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to invalidate cache for service ${slug}: ${message}`);
    }
  }

  async invalidateAllPublicCatalogCaches(): Promise<void> {
    if (!this.redisService.isConnected()) {
      return;
    }

    try {
      const keys = await this.redisService.getClient().keys(`${PUBLIC_SERVICE_CACHE_PREFIX}:*`);
      if (keys.length === 0) {
        return;
      }

      await this.redisService.getClient().del(...keys);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to invalidate public catalog caches: ${message}`);
    }
  }
}
