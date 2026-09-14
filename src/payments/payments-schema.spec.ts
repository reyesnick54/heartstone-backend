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
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11C_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
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
      expect(schema).toContain(status);
    });
  }

  for (const matchStatus of RECONCILIATION_MATCH_STATUSES) {
    it(`supports reconciliation match status ${matchStatus}`, () => {
      expect(schema).toContain(matchStatus);
    });
  }
});
