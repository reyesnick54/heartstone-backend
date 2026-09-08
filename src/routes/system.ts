import type { FastifyInstance } from 'fastify';
import { getVersionInfo } from '../config/version';
import { ReadinessService } from '../services/readiness';
import type { AppDependencies } from '../infrastructure/types';

export interface SystemRouteOptions {
  dependencies: AppDependencies;
}

export async function registerSystemRoutes(
  app: FastifyInstance,
  options: SystemRouteOptions,
): Promise<void> {
  const readinessService = new ReadinessService(options.dependencies);

  app.get('/health', async () => ({
    status: 'ok',
  }));

  app.get('/ready', async (_request, reply) => {
    const report = await readinessService.evaluate();

    if (report.status !== 'ready') {
      return reply.status(503).send(report);
    }

    return report;
  });

  app.get('/version', async () => getVersionInfo());
}
