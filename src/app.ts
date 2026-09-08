import Fastify from 'fastify';
import { registerSystemRoutes } from './routes/system';
import type { AppDependencies } from './infrastructure/types';

export interface CreateAppOptions {
  dependencies: AppDependencies;
  logger?: boolean;
}

export async function createApp(options: CreateAppOptions) {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  await registerSystemRoutes(app, {
    dependencies: options.dependencies,
  });

  return app;
}

export type AppInstance = Awaited<ReturnType<typeof createApp>>;
