import { type INestApplication } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { NestFactory } from '@nestjs/core';
import { type NestContainer } from '@nestjs/core/injector/container';
import {
  type OpenAPIObject,
  type OperationObject,
  type ReferenceObject,
  type SchemaObject,
} from '@nestjs/swagger';

import { AppModule } from '../app.module';
import { buildOpenApiDocument } from './openapi';

/**
 * Contract guard for the API surfaces the frontend generates a typed client from.
 *
 * Builds the OpenAPI document exactly like scripts/export-openapi.ts (Nest preview mode, no
 * database) and asserts that every operation under the covered prefixes declares a typed
 * success response, and that every write whose handler takes a request body declares a
 * request body schema with properties.
 */
const COVERED_PREFIXES = [
  '/api/v1/experience/citizen',
  // Applicant draft/submit/correction routes the citizen web app calls directly.
  '/api/v1/applications',
  '/api/v1/public',
  '/api/v1/identity/auth',
  '/api/v1/identity/me',
  // Common experience endpoints (navigation, inbox, search, actions, deep links, metadata).
  '/api/v1/experience/metadata',
  '/api/v1/experience/search',
  '/api/v1/experience/navigation',
  '/api/v1/experience/inbox',
  '/api/v1/experience/actions',
  '/api/v1/experience/deep-links',
] as const;

/**
 * Operations allowed to declare a success response without a body schema. Only routes that
 * genuinely return no body (204 No Content) belong here; there are none today. Add an entry
 * as `'METHOD /path'` with a comment explaining why the route has no response body.
 */
const NO_CONTENT_ALLOWLIST: ReadonlySet<string> = new Set<string>([]);

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const WRITE_METHODS: ReadonlySet<string> = new Set(['post', 'put', 'patch']);

interface CoveredOperation {
  key: string;
  method: (typeof HTTP_METHODS)[number];
  operation: OperationObject;
}

function isCovered(path: string): boolean {
  return COVERED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function collectCoveredOperations(document: OpenAPIObject): CoveredOperation[] {
  const operations: CoveredOperation[] = [];
  for (const [path, item] of Object.entries(document.paths)) {
    if (!isCovered(path)) {
      continue;
    }
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (operation) {
        operations.push({ key: `${method.toUpperCase()} ${path}`, method, operation });
      }
    }
  }
  return operations;
}

function resolveSchema(
  document: OpenAPIObject,
  schema: SchemaObject | ReferenceObject | undefined,
): SchemaObject | undefined {
  if (!schema) {
    return undefined;
  }
  if ('$ref' in schema) {
    const name = schema.$ref.split('/').pop() ?? '';
    return document.components?.schemas?.[name] as SchemaObject | undefined;
  }
  return schema;
}

function jsonSchemaOf(
  content: Record<string, { schema?: SchemaObject | ReferenceObject }> | undefined,
): SchemaObject | ReferenceObject | undefined {
  return content?.['application/json']?.schema;
}

/** True when the schema (or its array items) is a component with declared properties. */
function hasDeclaredShape(
  document: OpenAPIObject,
  schema: SchemaObject | ReferenceObject,
): boolean {
  const resolved = resolveSchema(document, schema);
  if (!resolved) {
    return false;
  }
  if (resolved.type === 'array') {
    return resolved.items !== undefined && hasDeclaredShape(document, resolved.items);
  }
  return Object.keys(resolved.properties ?? {}).length > 0;
}

/** Maps `Controller_method` operation ids to whether the handler binds a full `@Body()`. */
function collectHandlersWithBody(app: INestApplication): Map<string, boolean> {
  const container = (app as unknown as { container: NestContainer }).container;
  const handlers = new Map<string, boolean>();
  for (const moduleRef of container.getModules().values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const controller = wrapper.metatype as (new (...args: never[]) => unknown) | null;
      if (!controller?.prototype) {
        continue;
      }
      for (const methodName of Object.getOwnPropertyNames(controller.prototype)) {
        if (methodName === 'constructor') {
          continue;
        }
        const routeArgs = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) ??
          {}) as Record<string, { data?: unknown }>;
        const takesBody = Object.entries(routeArgs).some(
          ([key, arg]) =>
            key.split(':')[0] === String(RouteParamtypes.BODY) && arg.data === undefined,
        );
        handlers.set(`${controller.name}_${methodName}`, takesBody);
      }
    }
  }
  return handlers;
}

describe('OpenAPI contract for frontend-facing surfaces', () => {
  let app: INestApplication;
  let document: OpenAPIObject;
  let operations: CoveredOperation[];
  let handlersWithBody: Map<string, boolean>;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { preview: true, logger: false });
    app.setGlobalPrefix('api/v1');
    document = buildOpenApiDocument(app, { title: 'HeartStone API', version: 'v1' });
    operations = collectCoveredOperations(document);
    handlersWithBody = collectHandlersWithBody(app);
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('covers the expected citizen, public and identity surfaces', () => {
    const count = (prefix: string) =>
      operations.filter(({ key }) => key.split(' ')[1]?.startsWith(prefix)).length;

    expect(count('/api/v1/experience/citizen')).toBeGreaterThanOrEqual(89);
    expect(count('/api/v1/public')).toBeGreaterThanOrEqual(18);
    expect(count('/api/v1/identity/auth')).toBeGreaterThanOrEqual(5);
    expect(count('/api/v1/identity/me')).toBeGreaterThanOrEqual(2);
    expect(count('/api/v1/experience/deep-links')).toBeGreaterThanOrEqual(1);
  });

  it('every covered operation declares a typed success response', () => {
    const untyped = operations
      .filter(({ key }) => !NO_CONTENT_ALLOWLIST.has(key))
      .filter(({ operation }) => {
        const success = Object.entries(operation.responses).filter(([status]) =>
          /^2\d\d$/.test(status),
        );
        return !success.some(([, response]) => {
          const schema = jsonSchemaOf(
            (response as { content?: Record<string, { schema?: SchemaObject }> }).content,
          );
          return schema !== undefined && hasDeclaredShape(document, schema);
        });
      })
      .map(({ key }) => key);

    expect(untyped).toEqual([]);
  });

  it('every covered operation has a summary', () => {
    const missing = operations
      .filter(({ operation }) => !operation.summary?.trim())
      .map(({ key }) => key);

    expect(missing).toEqual([]);
  });

  it('every covered write that accepts a body declares a request body schema with properties', () => {
    const missing = operations
      .filter(({ method }) => WRITE_METHODS.has(method))
      .filter(({ operation }) => handlersWithBody.get(operation.operationId ?? '') === true)
      .filter(({ operation }) => {
        const body = operation.requestBody as
          { content?: Record<string, { schema?: SchemaObject }> } | undefined;
        const schema = jsonSchemaOf(body?.content);
        return schema === undefined || !hasDeclaredShape(document, schema);
      })
      .map(({ key }) => key);

    expect(missing).toEqual([]);
  });

  it('every covered write without a request body has a handler that binds no body', () => {
    const unexpected = operations
      .filter(({ method }) => WRITE_METHODS.has(method))
      .filter(({ operation }) => operation.requestBody === undefined)
      .filter(({ operation }) => handlersWithBody.get(operation.operationId ?? '') !== false)
      .map(({ key }) => key);

    expect(unexpected).toEqual([]);
  });

  it('types applicant submission bodies and free-form JSON fields instead of empty objects', () => {
    const schemas = (document.components?.schemas ?? {}) as Record<string, SchemaObject>;
    const propertiesOf = (name: string) => Object.keys(schemas[name]?.properties ?? {}).sort();

    expect(propertiesOf('SubmitApplicationDto')).toEqual([
      'answers',
      'configurationFingerprint',
      'idempotencyKey',
    ]);
    expect(propertiesOf('UpdateApplicationDraftDto')).toEqual(['draftAnswers']);

    const field = (schema: string, property: string) =>
      (schemas[schema]?.properties as Record<string, SchemaObject> | undefined)?.[property];
    /** An empty `{type: object}` is generated as `Record<string, never>` by frontend clients. */
    const isOpenJson = (value: SchemaObject | undefined) =>
      value !== undefined &&
      (value.additionalProperties === true ||
        (value.oneOf?.length ?? 0) > 0 ||
        (value.type !== undefined && value.type !== 'object'));

    expect(isOpenJson(field('PublicServiceEligibilityDto', 'attributes'))).toBe(true);
    expect(isOpenJson(field('RenderedFormFieldSchemaDto', 'defaultValue'))).toBe(true);
    expect(isOpenJson(field('FormConditionClauseSchemaDto', 'value'))).toBe(true);
    expect(isOpenJson(field('SubmitApplicationDto', 'answers'))).toBe(true);
    expect(isOpenJson(field('UpdateApplicationDraftDto', 'draftAnswers'))).toBe(true);
    expect(field('CitizenCredentialSummaryDto', 'conditions')?.items).toEqual({
      $ref: '#/components/schemas/CitizenCredentialConditionDto',
    });
  });

  it('does not expose actor identity fields in covered request bodies', () => {
    const forbidden = ['actorIdentityId', 'performedByIdentityId', 'applicantIdentityId'];
    const leaks: string[] = [];
    for (const { key, operation } of operations) {
      const body = operation.requestBody as
        { content?: Record<string, { schema?: SchemaObject }> } | undefined;
      const resolved = resolveSchema(document, jsonSchemaOf(body?.content));
      for (const field of forbidden) {
        if (resolved?.properties && field in resolved.properties) {
          leaks.push(`${key}: ${field}`);
        }
      }
    }

    expect(leaks).toEqual([]);
  });
});
