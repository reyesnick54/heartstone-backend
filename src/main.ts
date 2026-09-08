import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';
import {
  APP_CONFIG,
  AppConfig,
  SECURITY_CONFIG,
  SecurityConfig,
} from './config/config.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  configureApplication(app);

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>(APP_CONFIG);
  const securityConfig =
    configService.getOrThrow<SecurityConfig>(SECURITY_CONFIG);

  await app.listen(appConfig.port, '0.0.0.0');

  logger.log(
    `Application "${appConfig.name}" listening on port ${appConfig.port}`,
    'Bootstrap',
  );
  logger.log(`API available at /api/${appConfig.apiVersion}`, 'Bootstrap');

  if (securityConfig.swaggerEnabled) {
    logger.log('OpenAPI documentation available at /docs', 'Bootstrap');
  }
}

void bootstrap();
