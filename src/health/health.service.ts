import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface ReadinessCheckResult {
  status: 'ok' | 'error';
  checks: {
    redis: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly redisService: RedisService) {}

  async checkReadiness(): Promise<ReadinessCheckResult> {
    try {
      const response = await this.redisService.ping();
      const redisUp = response === 'PONG';

      return {
        status: redisUp ? 'ok' : 'error',
        checks: {
          redis: redisUp ? 'up' : 'down',
        },
      };
    } catch {
      return {
        status: 'error',
        checks: {
          redis: 'down',
        },
      };
    }
  }
}
