import { afterEach, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from '../helpers/test-app';
import { createHealthyProbe, createUnhealthyProbe } from '../helpers/fake-probes';
import type { TestAppContext } from '../helpers/test-app';

describe('system routes', () => {
  let context: TestAppContext;

  afterEach(async () => {
    if (context) {
      await closeTestApp(context);
    }
  });

  describe('GET /health', () => {
    it('returns 200 with expected structure', async () => {
      context = await createTestApp();
      const response = await context.app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });

  describe('GET /ready', () => {
    it('returns 200 when dependencies are healthy', async () => {
      context = await createTestApp({
        database: createHealthyProbe(),
        redis: createHealthyProbe(),
      });
      const response = await context.app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: 'ready',
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      });
    });

    it('returns 503 when a dependency is unhealthy', async () => {
      context = await createTestApp({
        database: createUnhealthyProbe('database unavailable'),
        redis: createHealthyProbe(),
      });
      const response = await context.app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        status: 'not_ready',
        checks: {
          database: 'error',
          redis: 'ok',
        },
        messages: {
          database: 'database unavailable',
        },
      });
    });
  });

  describe('GET /version', () => {
    it('returns 200 with expected structure', async () => {
      context = await createTestApp();
      const response = await context.app.inject({ method: 'GET', url: '/version' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        name: 'heartstone-backend',
        version: '0.1.0',
      });
    });
  });

  describe('application initialization', () => {
    it('registers system routes during app creation', async () => {
      context = await createTestApp();

      const health = await context.app.inject({ method: 'GET', url: '/health' });
      const ready = await context.app.inject({ method: 'GET', url: '/ready' });
      const version = await context.app.inject({ method: 'GET', url: '/version' });

      expect(health.statusCode).toBe(200);
      expect(ready.statusCode).toBe(200);
      expect(version.statusCode).toBe(200);
    });
  });
});
