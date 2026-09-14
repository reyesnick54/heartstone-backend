import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INVOICE_STATUSES,
  PAYMENT_CHANNEL_CODES,
  PAYMENT_INTENT_STATUSES,
  PAYMENT_TRANSACTION_TYPES,
  PHASE_11A_ENUM_NAMES,
  PHASE_11A_MODEL_NAMES,
  PHASE_11B_ENUM_NAMES,
  PHASE_11B_MODEL_NAMES,
} from './payments-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 11A invoicing schema', () => {
  for (const modelName of PHASE_11A_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11A_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const status of INVOICE_STATUSES) {
    it(`supports invoice status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }
});

describe('Phase 11B payment schema', () => {
  for (const modelName of PHASE_11B_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11B_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const channel of PAYMENT_CHANNEL_CODES) {
    it(`supports payment channel ${channel}`, () => {
      expect(schema).toContain(channel);
    });
  }

  for (const status of PAYMENT_INTENT_STATUSES) {
    it(`supports payment intent status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const type of PAYMENT_TRANSACTION_TYPES) {
    it(`supports payment transaction type ${type}`, () => {
      expect(schema).toContain(type);
    });
  }

  it('stores provider webhook audit fields', () => {
    const block = /model PaymentProviderWebhookEvent \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('signatureValidationResult');
    expect(block).toContain('timestampValidation');
    expect(block).toContain('externalEventId');
    expect(block).toContain('payloadHash');
  });

  it('does not store credential secrets in provider configuration', () => {
    const block = /model PaymentProviderConfiguration \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('credentialReference');
    expect(block).not.toContain('apiKey');
    expect(block).not.toContain('secretToken');
  });

  it('enforces webhook external event idempotency', () => {
    expect(schema).toContain('@@unique([provider, externalEventId])');
  });
});
