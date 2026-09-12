import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7_MODELS } from './application-processing.constants';
import {
  APPLICATION_PROCESSING_MODEL_NAMES,
  FORBIDDEN_APPLICATION_AUTHORITY_FIELDS,
  FORBIDDEN_CASE_CLIENT_MUTATION_FIELDS,
} from './application-processing-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

describe('Application processing schema coherence (Phase 6)', () => {
  const schema = readSchema();

  it('defines all canonical application processing models exactly once', () => {
    for (const modelName of APPLICATION_PROCESSING_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('does not define Phase 7 decision, issuance, or evidence vault models', () => {
    for (const modelName of FORBIDDEN_PHASE_7_MODELS) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });

  it('keeps ApplicationSubmission immutable with content hash', () => {
    const block = extractModelBlock(schema, 'ApplicationSubmission');
    expect(block).toContain('contentHash');
    expect(block).toContain('answersSnapshot');
    expect(block).toContain('supersededAt');
  });

  it('pins Case to workflow and service versions', () => {
    const block = extractModelBlock(schema, 'Case');
    expect(block).toContain('workflowVersionId');
    expect(block).toContain('governmentServiceVersionId');
    expect(block).toContain('configurationFingerprint');
  });

  it('does not embed authority fields on Application', () => {
    const block = extractModelBlock(schema, 'Application');
    for (const field of FORBIDDEN_APPLICATION_AUTHORITY_FIELDS) {
      expect(block).not.toContain(field);
    }
  });

  it('does not embed client-writable decision outcome fields on Case', () => {
    const block = extractModelBlock(schema, 'Case');
    for (const field of FORBIDDEN_CASE_CLIENT_MUTATION_FIELDS) {
      expect(block).not.toContain(`${field} `);
    }
  });

  it('separates CaseAssignment from institutional authority', () => {
    const block = extractModelBlock(schema, 'CaseAssignment');
    expect(block).toContain('assignmentRole');
    expect(block).not.toContain('authorityGranted');
    expect(block).not.toContain('hasAuthority');
  });

  it('models CasePublicStatusProjection as read model', () => {
    expect(schema).toContain('model CasePublicStatusProjection');
    const block = extractModelBlock(schema, 'CasePublicStatusProjection');
    expect(block).toContain('sourceCaseStatus');
    expect(block).toContain('publicStatusLabel');
  });
});
