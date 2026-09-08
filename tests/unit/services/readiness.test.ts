import { describe, expect, it } from 'vitest';
import { ReadinessService } from '../../../src/services/readiness';
import {
  createControllableProbe,
  createHealthyProbe,
  createUnhealthyProbe,
} from '../../helpers/fake-probes';

describe('ReadinessService', () => {
  it('reports ready when all dependencies are healthy', async () => {
    const service = new ReadinessService({
      database: createHealthyProbe(),
      redis: createHealthyProbe(),
    });

    const report = await service.evaluate();

    expect(report).toEqual({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    });
  });

  it('reports not_ready when database is unhealthy', async () => {
    const service = new ReadinessService({
      database: createUnhealthyProbe('database down'),
      redis: createHealthyProbe(),
    });

    const report = await service.evaluate();

    expect(report.status).toBe('not_ready');
    expect(report.checks.database).toBe('error');
    expect(report.checks.redis).toBe('ok');
    expect(report.messages?.database).toBe('database down');
  });

  it('reports not_ready when redis is unhealthy', async () => {
    const service = new ReadinessService({
      database: createHealthyProbe(),
      redis: createUnhealthyProbe('redis down'),
    });

    const report = await service.evaluate();

    expect(report.status).toBe('not_ready');
    expect(report.checks.database).toBe('ok');
    expect(report.checks.redis).toBe('error');
    expect(report.messages?.redis).toBe('redis down');
  });

  it('evaluates database and redis checks concurrently', async () => {
    const database = createControllableProbe();
    const redis = createControllableProbe();
    const service = new ReadinessService({
      database: database.probe,
      redis: redis.probe,
    });

    const report = await service.evaluate();

    expect(report.status).toBe('ready');
    expect(report.checks).toEqual({ database: 'ok', redis: 'ok' });
  });
});

describe('getVersionInfo', () => {
  it('returns package name and version', async () => {
    const { getVersionInfo } = await import('../../../src/config/version');
    const version = getVersionInfo();

    expect(version).toEqual({
      name: 'heartstone-backend',
      version: '0.1.0',
    });
  });
});
