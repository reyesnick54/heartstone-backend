import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Single source for the OpenAPI document served at /docs and exported for API clients. */
export function buildOpenApiDocument(
  app: INestApplication,
  options: { title: string; version: string },
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(
      'HeartStone backend API. Technical permissions never confer legal authority: ' +
        'consequential actions are additionally checked by the authority engine.',
    )
    .setVersion(options.version)
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
  });
}
