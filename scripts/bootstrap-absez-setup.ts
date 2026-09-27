import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { AbsezSetupBootstrapService } from '../src/setup/bootstrap/absez-setup-bootstrap.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const bootstrap = app.get(AbsezSetupBootstrapService);
    const result = await bootstrap.bootstrapAbsezConfiguration();
    // eslint-disable-next-line no-console -- CLI entrypoint
    console.log(JSON.stringify({ status: 'ok', ...result }, null, 2));
  } finally {
    await app.close();
  }
}

void main();
