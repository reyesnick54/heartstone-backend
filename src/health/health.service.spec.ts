import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { RedisService } from '../redis/redis.service';

describe('HealthService', () => {
  let healthService: HealthService;
  let redisService: { ping: jest.Mock };

  beforeEach(async () => {
    redisService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    healthService = module.get(HealthService);
  });

  it('reports readiness as ok when Redis responds to ping', async () => {
    redisService.ping.mockResolvedValue('PONG');

    await expect(healthService.checkReadiness()).resolves.toEqual({
      status: 'ok',
      checks: {
        redis: 'up',
      },
    });
  });

  it('reports readiness as error when Redis ping fails', async () => {
    redisService.ping.mockRejectedValue(new Error('Redis unavailable'));

    await expect(healthService.checkReadiness()).resolves.toEqual({
      status: 'error',
      checks: {
        redis: 'down',
      },
    });
  });

  it('reports readiness as error when Redis returns an unexpected response', async () => {
    redisService.ping.mockResolvedValue('UNEXPECTED');

    await expect(healthService.checkReadiness()).resolves.toEqual({
      status: 'error',
      checks: {
        redis: 'down',
      },
    });
  });
});
