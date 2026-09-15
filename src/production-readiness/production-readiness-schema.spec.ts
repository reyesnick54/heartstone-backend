import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ENVIRONMENT_CLASSIFICATIONS } from './production-readiness.constants';
import {
  PHASE_13E_ENUM_NAMES,
  PHASE_13E_MODEL_NAMES,
} from './production-readiness-schema.constants';
import {
  LAUNCH_GATE_REQUIREMENTS,
  MUST_FAIL_INVARIANT_COUNT,
  PHASE_13_BOUNDARY_DISCLAIMERS,
  STABILIZATION_MONITORING_CATEGORIES,
} from './production-readiness.constants';
import { PHASE_13_ENUM_NAMES, PHASE_13_MODEL_NAMES } from './production-readiness-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 13E schema guard', () => {
  for (const modelName of PHASE_13E_MODEL_NAMES) {
describe('Phase 13 production readiness schema guard', () => {
  for (const modelName of PHASE_13_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13E_ENUM_NAMES) {
  for (const enumName of PHASE_13_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const classification of PLATFORM_ENVIRONMENT_CLASSIFICATIONS) {
    it(`supports environment classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }
  it('requires launch readiness snapshot integrity hash', () => {
    expect(schema).toContain('integrityHash');
  });

  it('requires accountable owner on operational activation', () => {
    expect(schema).toContain('accountableOwnerIdentityId');
  });

  it('supports scoped operational suspension', () => {
    expect(schema).toContain('OperationalSuspensionScope');
    expect(schema).toContain('ENTIRE_PLATFORM');
    expect(schema).toContain('DEPARTMENT');
    expect(schema).toContain('AI_USE_CASE');
  });

  it('requires verification on corrective actions', () => {
    expect(schema).toContain('verificationRequired');
    expect(schema).toContain('verifiedAt');
  });

  it('preserves records on suspension by default', () => {
    expect(schema).toContain('preserveRecords');
    expect(schema).toContain('@default(true)');
  });

  it('tracks exit acceptance separately from technical shutdown', () => {
    expect(schema).toContain('ExitAcceptanceRecord');
    expect(schema).toContain('institutionalAcceptorIdentityId');
  });

  it('documents boundary invariants', () => {
    expect(Object.keys(PHASE_13_BOUNDARY_DISCLAIMERS).length).toBeGreaterThanOrEqual(16);
    expect(LAUNCH_GATE_REQUIREMENTS.length).toBeGreaterThanOrEqual(19);
    expect(STABILIZATION_MONITORING_CATEGORIES.length).toBe(13);
    expect(MUST_FAIL_INVARIANT_COUNT).toBe(100);
  });
});
