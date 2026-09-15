import { DependencyHealthState, DependencyType } from '@prisma/client';

import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { ServiceHealthService } from './service-health.service';

describe('ServiceHealthService', () => {
  const prismaMock = {
    isHealthy: jest.fn().mockResolvedValue(true),
  };
  const redisMock = {
    ping: jest.fn().mockResolvedValue('PONG'),
  };
  const boundary = new ProductionReliabilityBoundaryService();

  const service = new ServiceHealthService(prismaMock as never, redisMock as never, boundary);

  it('assesses technical health without claiming institutional acceptance', async () => {
    const result = await service.assessTechnicalHealth();
    expect(result.notInstitutionalStatus).toBe(true);
    expect(result.technicalHealthState).toBe('READY');
    expect(result.dependencies.length).toBeGreaterThanOrEqual(2);
  });

  it('records dependency health with stale integration surfaced', () => {
    const check = service.recordDependencyHealth({
      dependencyType: DependencyType.EXTERNAL_INTEGRATION,
      reference: 'registry-api',
      state: DependencyHealthState.STALE,
      isStale: true,
    });
    expect(check.isStale).toBe(true);
    expect(check.state).toBe(DependencyHealthState.STALE);
  });
});
