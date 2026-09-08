import { createApp, type AppInstance } from '../../src/app';
import type { AppDependencies } from '../../src/infrastructure/types';
import { createHealthyProbe } from './fake-probes';

export interface TestAppContext {
  app: AppInstance;
  dependencies: AppDependencies;
}

export async function createTestApp(
  dependencies: Partial<AppDependencies> = {},
): Promise<TestAppContext> {
  const resolvedDependencies: AppDependencies = {
    database: dependencies.database ?? createHealthyProbe(),
    redis: dependencies.redis ?? createHealthyProbe(),
  };

  const app = await createApp({
    dependencies: resolvedDependencies,
    logger: false,
  });

  return {
    app,
    dependencies: resolvedDependencies,
  };
}

export async function closeTestApp(context: TestAppContext): Promise<void> {
  await context.app.close();
}
