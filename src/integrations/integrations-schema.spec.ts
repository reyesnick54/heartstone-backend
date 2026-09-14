import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INTEGRATION_EXCHANGE_STATUSES,
  INTEGRATION_MODEL_NAMES,
  INTEGRATION_OPERATIONS,
} from './integrations-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Integrations schema coherence (Phase 11F)', () => {
  const schema = readSchema();

  it('defines all canonical integration gateway models', () => {
    for (const modelName of INTEGRATION_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all canonical exchange statuses', () => {
    const block = extractEnumBlock(schema, 'IntegrationExchangeStatus');
    for (const status of INTEGRATION_EXCHANGE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines all canonical integration operations', () => {
    const block = extractEnumBlock(schema, 'IntegrationOperation');
    for (const operation of INTEGRATION_OPERATIONS) {
      expect(block).toContain(operation);
    }
  });

  it('enforces idempotency uniqueness on integration requests', () => {
    const block = extractModelBlock(schema, 'IntegrationRequest');
    expect(block).toMatch(/@@unique\(\[integrationVersionId, idempotencyKey\]\)/);
  });

  it('enforces webhook event deduplication by external event id', () => {
    const block = extractModelBlock(schema, 'IntegrationWebhookEvent');
    expect(block).toMatch(/@@unique\(\[integrationVersionId, externalEventId\]\)/);
  });

  it('stores response validation separately from http status', () => {
    const block = extractModelBlock(schema, 'IntegrationResponseRecord');
    expect(block).toContain('httpStatusCode');
    expect(block).toContain('isValidated');
  });

  it('records lossy transformation disclosure', () => {
    const block = extractModelBlock(schema, 'IntegrationDataTransformation');
    expect(block).toContain('lossyFields');
    expect(block).toContain('warnings');
    expect(block).toContain('mappingVersion');
  });
});
