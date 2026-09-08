import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../src/app';
import { createHealthyProbe, createUnhealthyProbe } from '../helpers/fake-probes';

describe('system endpoints (e2e)', () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp({
      dependencies: {
        database: createHealthyProbe(),
        redis: createHealthyProbe(),
      },
      logger: false,
    });

    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with expected structure over HTTP', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /ready', () => {
    it('returns 200 when dependencies are healthy', async () => {
      const response = await fetch(`${baseUrl}/ready`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        status: 'ready',
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      });
    });
  });

  describe('GET /version', () => {
    it('returns 200 with expected structure over HTTP', async () => {
      const response = await fetch(`${baseUrl}/version`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        name: 'heartstone-backend',
        version: '0.1.0',
      });
    });
  });

  describe('application initialization', () => {
    it('starts an HTTP server and serves all system endpoints', async () => {
      const endpoints = ['/health', '/ready', '/version'];

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint}`);
        expect(response.ok).toBe(true);
      }
    });

    it('returns 503 from /ready when dependencies are unhealthy', async () => {
      const unhealthyApp = await createApp({
        dependencies: {
          database: createUnhealthyProbe('database unavailable'),
          redis: createHealthyProbe(),
        },
        logger: false,
      });

      await unhealthyApp.listen({ host: '127.0.0.1', port: 0 });
      const address = unhealthyApp.server.address() as AddressInfo;
      const unhealthyBaseUrl = `http://127.0.0.1:${address.port}`;

      const response = await fetch(`${unhealthyBaseUrl}/ready`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        status: 'not_ready',
        checks: {
          database: 'error',
          redis: 'ok',
        },
      });

      await unhealthyApp.close();
    });
  });
});
