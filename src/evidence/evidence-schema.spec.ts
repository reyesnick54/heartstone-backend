import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7_MODELS } from '../application-processing/application-processing.constants';
import { PHASE_7D_MODEL_NAMES } from './evidence.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

describe('Evidence schema coherence (Phase 7D)', () => {
  const schema = readSchema();

  it('defines all Phase 7D attributable record models exactly once', () => {
    for (const modelName of PHASE_7D_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('still forbids Phase 7 vault and decision models', () => {
    for (const modelName of FORBIDDEN_PHASE_7_MODELS) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });

  it('models government communication categories without approval collapse', () => {
    const block = schema.slice(
      schema.indexOf('enum GovernmentCommunicationCategory'),
      schema.indexOf('enum GovernmentCommunicationAuthenticationStatus'),
    );
    expect(block).toContain('RECEIPT');
    expect(block).toContain('ACKNOWLEDGMENT');
    expect(block).toContain('CONCURRENCE');
    expect(block).not.toContain('APPROVAL');
  });

  it('keeps departmental reviews separately attributable per department and version', () => {
    const block = extractModelBlock(schema, 'DepartmentalReviewRecord');
    expect(block).toContain('departmentId');
    expect(block).toContain('reviewerOfficeholderId');
    expect(block).toContain('reviewVersion');
    expect(block).toContain('authorityEvaluationRecordId');
  });

  it('requires professional signature source and blocks implicit AI signing', () => {
    const block = extractModelBlock(schema, 'ProfessionalReviewRecord');
    expect(block).toContain('signatureSource');
    expect(block).toContain('professionalIdentityId');
  });

  it('keeps inspection evidence items distinct from enforcement findings', () => {
    const block = extractModelBlock(schema, 'InspectionEvidenceItem');
    expect(block).toContain('findingClassification');
    expect(block).toContain('OBSERVATION');
  });

  it('models evidence custody events as append-only records', () => {
    const block = extractModelBlock(schema, 'EvidenceCustodyEvent');
    expect(block).toContain('eventType');
    expect(block).toContain('integrityState');
    expect(block).not.toContain('updatedAt');
  });
});
