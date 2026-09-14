import { HttpException } from '@nestjs/common';
import { RateLimitScope } from '@prisma/client';

import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  const boundary = new ProductionReliabilityBoundaryService();
  const redisMock = {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  };
  const redisServiceMock = {
    getClient: () => redisMock,
  };

  const service = new RateLimitService(redisServiceMock as never, boundary);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns observable state when under limit', async () => {
    const observation = await service.assertAllowed(RateLimitScope.SEARCH, 'client-1');
    expect(observation.limited).toBe(false);
    expect(observation.scope).toBe(RateLimitScope.SEARCH);
  });

  it('throws observable rate limit exception when exceeded', async () => {
    redisMock.incr.mockResolvedValue(1000);

    await expect(service.assertAllowed(RateLimitScope.AUTHENTICATION, 'client-2')).rejects.toThrow(
      HttpException,
    );
  });

  it('exposes observable rate limit state', () => {
    const state = service.getObservableState(RateLimitScope.UPLOAD, 'client-3', 10);
    expect(state.currentCount).toBe(10);
    expect(state.scope).toBe(RateLimitScope.UPLOAD);
  });
});
