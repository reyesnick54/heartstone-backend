import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let healthService: HealthService;
  let prismaService: { isHealthy: jest.Mock };
  let redisService: { ping: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      isHealthy: jest.fn(),
    };
    redisService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    healthService = module.get(HealthService);
  });

  it('reports ready when PostgreSQL and Redis are healthy', async () => {
    prismaService.isHealthy.mockResolvedValue(true);
    redisService.ping.mockResolvedValue('PONG');

    await expect(healthService.checkReadiness()).resolves.toEqual({
      status: 'ready',
      checks: {
        database: 'up',
        redis: 'up',
      },
    });
  });

  it('reports not_ready when PostgreSQL is unavailable', async () => {
    prismaService.isHealthy.mockResolvedValue(false);
    redisService.ping.mockResolvedValue('PONG');

    await expect(healthService.checkReadiness()).resolves.toEqual({
      status: 'not_ready',
      checks: {
        database: 'down',
        redis: 'up',
      },
    });
  });

  it('reports not_ready when Redis is unavailable', async () => {
    prismaService.isHealthy.mockResolvedValue(true);
    redisService.ping.mockRejectedValue(new Error('Redis unavailable'));

    await expect(healthService.checkReadiness()).resolves.toEqual({
      status: 'not_ready',
      checks: {
        database: 'up',
        redis: 'down',
      },
    });
  });
});
