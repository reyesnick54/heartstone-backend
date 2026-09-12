import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATION_MODEL_NAMES,
  APPLICATION_STATUS_VALUES,
  FORBIDDEN_APPLICATION_STATUS_VALUES,
  PHASE_6C_BOUNDARY_MODEL_NAMES,
} from './common/applications-schema.constants';

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

describe('Applications schema coherence (Phase 6A)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6A application models', () => {
    for (const modelName of APPLICATION_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines controlled application lifecycle statuses without approval outcomes', () => {
    const block = extractEnumBlock(schema, 'ApplicationStatus');
    for (const status of APPLICATION_STATUS_VALUES) {
      expect(block).toContain(status);
    }

    for (const forbidden of FORBIDDEN_APPLICATION_STATUS_VALUES) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('keeps applicationNumber immutable and unique on Application', () => {
    const block = extractModelBlock(schema, 'Application');
    expect(block).toMatch(/applicationNumber\s+String\s+@unique/);
  });

  it('pins service and form versions on ApplicationSubmission without overwrite semantics', () => {
    const block = extractModelBlock(schema, 'ApplicationSubmission');
    expect(block).toContain('serviceVersionId');
    expect(block).toContain('formVersionId');
    expect(block).toContain('configurationFingerprint');
    expect(block).toContain('answersPayload');
    expect(block).toContain('payloadHash');
    expect(block).toContain('supersedesSubmissionId');
    expect(block).toMatch(/@@unique\(\[applicationId, submissionSequence\]\)/);
  });

  it('supports idempotency keys for submission deduplication', () => {
    const block = extractModelBlock(schema, 'ApplicationSubmissionIdempotencyKey');
    expect(block).toMatch(/idempotencyKey\s+String\s+@unique/);
    expect(block).toContain('submissionId');
  });

  it('does not define Phase 6C case workflow or decision models', () => {
    for (const modelName of PHASE_6C_BOUNDARY_MODEL_NAMES) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
