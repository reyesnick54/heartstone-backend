import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { checkReadiness: jest.Mock };

  beforeEach(async () => {
    healthService = {
      checkReadiness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns 200 for /ready when dependencies are healthy', async () => {
    const readinessResult = {
      status: 'ok' as const,
      checks: { redis: 'up' as const },
    };
    healthService.checkReadiness.mockResolvedValue(readinessResult);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const response = { status, json } as unknown as Response;

    await controller.ready(response);

    expect(healthService.checkReadiness).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(json).toHaveBeenCalledWith(readinessResult);
  });

  it('returns 503 for /ready when dependencies are unhealthy', async () => {
    const readinessResult = {
      status: 'error' as const,
      checks: { redis: 'down' as const },
    };
    healthService.checkReadiness.mockResolvedValue(readinessResult);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const response = { status, json } as unknown as Response;

    await controller.ready(response);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(readinessResult);
  });
});
