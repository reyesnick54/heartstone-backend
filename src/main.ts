import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`Application listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  Logger.error(`Application failed to start: ${message}`, stack, 'Bootstrap');
  process.exit(1);
});
