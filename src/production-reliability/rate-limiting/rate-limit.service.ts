import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RateLimitScope } from '@prisma/client';

import { RedisService } from '../../redis/redis.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { DEFAULT_RATE_LIMITS } from '../production-reliability.constants';

export interface RateLimitObservation {
  scope: RateLimitScope;
  clientKey: string;
  currentCount: number;
  maxRequests: number;
  windowSeconds: number;
  limited: boolean;
  mandatoryFallback?: string;
}

@Injectable()
export class RateLimitService {
  constructor(
    private readonly redisService: RedisService,
    private readonly boundary: ProductionReliabilityBoundaryService,
  ) {}

  async assertAllowed(
    scope: RateLimitScope,
    clientKey: string,
    options?: { isMandatoryProcess?: boolean },
  ): Promise<RateLimitObservation> {
    const config = DEFAULT_RATE_LIMITS[scope];
    if (!config) {
      return {
        scope,
        clientKey,
        currentCount: 0,
        maxRequests: 0,
        windowSeconds: 0,
        limited: false,
      };
    }

    this.boundary.assertMandatoryRateLimitHasFallback(
      options?.isMandatoryProcess ?? false,
      Boolean(config.mandatoryFallback),
      scope,
    );

    const redisKey = `rate-limit:${scope}:${clientKey}`;
    const count = await this.increment(redisKey, config.windowSeconds);
    const limited = count > config.maxRequests;

    const observation: RateLimitObservation = {
      scope,
      clientKey,
      currentCount: count,
      maxRequests: config.maxRequests,
      windowSeconds: config.windowSeconds,
      limited,
      mandatoryFallback: config.mandatoryFallback,
    };

    if (limited) {
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          scope,
          mandatoryFallback: config.mandatoryFallback,
          observable: true,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return observation;
  }

  getObservableState(
    scope: RateLimitScope,
    clientKey: string,
    currentCount: number,
  ): RateLimitObservation {
    const config = DEFAULT_RATE_LIMITS[scope];
    return {
      scope,
      clientKey,
      currentCount,
      maxRequests: config?.maxRequests ?? 0,
      windowSeconds: config?.windowSeconds ?? 0,
      limited: config ? currentCount >= config.maxRequests : false,
      mandatoryFallback: config?.mandatoryFallback,
    };
  }

  private async increment(key: string, windowSeconds: number): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, windowSeconds);
      }
      return count;
    } catch {
      return 1;
    }
  }
}
