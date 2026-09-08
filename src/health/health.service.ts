import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface ReadinessCheckResult {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async checkReadiness(): Promise<ReadinessCheckResult> {
    const [databaseUp, redisUp] = await Promise.all([
      this.prismaService.isHealthy(),
      this.checkRedis(),
    ]);

    return {
      status: databaseUp && redisUp ? 'ready' : 'not_ready',
      checks: {
        database: databaseUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redisService.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
