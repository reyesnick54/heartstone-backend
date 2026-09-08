import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Express, json, urlencoded } from 'express';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import {
  APP_CONFIG,
  AppConfig,
  SECURITY_CONFIG,
  SecurityConfig,
} from '../config/config.constants';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>(APP_CONFIG);
  const securityConfig =
    configService.getOrThrow<SecurityConfig>(SECURITY_CONFIG);

  if (securityConfig.trustProxy) {
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: appConfig.nodeEnv === 'production',
      crossOriginEmbedderPolicy: appConfig.nodeEnv === 'production',
    }),
  );

  app.use(json({ limit: securityConfig.bodyLimit }));
  app.use(
    urlencoded({
      extended: true,
      limit: securityConfig.bodyLimit,
    }),
  );

  if (securityConfig.cors.enabled) {
    app.enableCors({
      origin: securityConfig.cors.origins,
      credentials: securityConfig.cors.credentials,
    });
  }

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
  app.useGlobalFilters(new AllExceptionsFilter(appConfig.nodeEnv));
  app.enableShutdownHooks();

  if (securityConfig.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appConfig.name)
      .setDescription('HeartStone backend API')
      .setVersion(appConfig.apiVersion)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }
}
