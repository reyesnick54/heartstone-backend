#!/usr/bin/env ts-node
/**
 * Writes the HeartStone OpenAPI document to openapi/openapi.json (or the path given as the
 * first argument) without connecting to PostgreSQL or Redis.
 *
 * Nest's preview mode builds the module graph and route metadata but does not run provider
 * constructors or lifecycle hooks, so no database is needed.
 *
 * Run: npm run openapi:export
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/bootstrap/openapi';

async function main(): Promise<void> {
  const output = path.resolve(
    process.argv[2] ?? path.join(__dirname, '..', 'openapi', 'openapi.json'),
  );
  const app = await NestFactory.create(AppModule, { preview: true, logger: ['error'] });
  app.setGlobalPrefix('api/v1');
  const document = buildOpenApiDocument(app, {
    title: 'HeartStone API',
    version: process.env.API_VERSION ?? 'v1',
  });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  const operations = Object.values(document.paths).reduce(
    (count, item) => count + Object.keys(item).length,
    0,
  );
  console.log(`Wrote ${String(operations)} operations to ${output}`);
  await app.close();
}

void main();
