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
import { NestFactory } from '@nestjs/core';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
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
  await app.listen(process.env.PORT ?? 3000);
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { APP_CONFIG, AppConfig } from './config/config.constants';

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

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>(APP_CONFIG);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appConfig.name)
    .setDescription('HeartStone backend API')
    .setVersion(appConfig.apiVersion)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(appConfig.port);

  logger.log(
    `Application "${appConfig.name}" listening on port ${appConfig.port}`,
    'Bootstrap',
  );
  logger.log(`API available at /api/${appConfig.apiVersion}`, 'Bootstrap');

  const securityConfig =
    configService.getOrThrow<SecurityConfig>(SECURITY_CONFIG);
  if (securityConfig.swaggerEnabled) {
    logger.log('OpenAPI documentation available at /docs', 'Bootstrap');
  }
  logger.log('OpenAPI documentation available at /docs', 'Bootstrap');
}

void bootstrap();
