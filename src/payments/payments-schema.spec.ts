import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FEE_ADJUSTMENT_TYPES,
  RECONCILIATION_MATCH_STATUSES,
  REFUND_REQUEST_STATUSES,
} from './payments.constants';
import {
  PHASE_11_PREREQUISITE_MODEL_NAMES,
  PHASE_11C_ENUM_NAMES,
  PHASE_11C_MODEL_NAMES,
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

describe('Phase 11C payments schema guard', () => {
  for (const modelName of PHASE_11_PREREQUISITE_MODEL_NAMES) {
    it(`defines prerequisite model ${modelName}`, () => {
      expect(schema).toContain(`model ${modelName}`);
    });
  }

  for (const modelName of PHASE_11C_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
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

  for (const enumName of PHASE_11C_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
  for (const enumName of PHASE_11B_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const adjustmentType of FEE_ADJUSTMENT_TYPES) {
    it(`supports fee adjustment type ${adjustmentType}`, () => {
      expect(schema).toContain(adjustmentType);
    });
  }

  for (const status of REFUND_REQUEST_STATUSES) {
    it(`supports refund status ${status}`, () => {
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

  for (const matchStatus of RECONCILIATION_MATCH_STATUSES) {
    it(`supports reconciliation match status ${matchStatus}`, () => {
      expect(schema).toContain(matchStatus);
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
