import { createApp } from './app';
import { loadRuntimeConfig } from './config/env';
import { createProductionDependencies } from './infrastructure/dependencies';

async function start(): Promise<void> {
  const config = loadRuntimeConfig();
  const dependencies = createProductionDependencies(config);
  const app = await createApp({ dependencies, logger: true });

  await app.listen({
    host: config.host,
    port: config.port,
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
