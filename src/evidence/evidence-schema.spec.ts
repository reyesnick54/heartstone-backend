import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7D_MODELS } from './evidence.constants';
import {
  EVIDENCE_ACCEPTANCE_PURPOSES,
  EVIDENCE_MODEL_NAMES,
  EVIDENCE_QUALITY_CRITERIA,
  EVIDENCE_RECORD_STATUSES,
  EVIDENCE_VERIFICATION_CATEGORIES,
} from './evidence-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Evidence schema coherence (Phase 7C)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 7C evidence models exactly once', () => {
    for (const modelName of EVIDENCE_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines evidence statuses without a single verified boolean field', () => {
    const block = extractEnumBlock(schema, 'EvidenceRecordStatus');
    for (const status of EVIDENCE_RECORD_STATUSES) {
      expect(block).toContain(status);
    }
    const evidenceBlock = schema.slice(
      schema.indexOf('model EvidenceRecord'),
      schema.indexOf('model EvidenceVerification'),
    );
    expect(evidenceBlock).not.toMatch(/\bverified\s+Boolean/);
    expect(evidenceBlock).not.toMatch(/\bisVerified\s+Boolean/);
  });

  it('defines verification categories including integrity and content fact separation', () => {
    const block = extractEnumBlock(schema, 'EvidenceVerificationCategory');
    for (const category of EVIDENCE_VERIFICATION_CATEGORIES) {
      expect(block).toContain(category);
    }
  });

  it('links evidence requirements to GovernmentServiceChecklistItem', () => {
    expect(schema).toContain('checklistItemId');
    expect(schema).toContain('EvidenceRequirementLink');
    expect(schema).toContain('GovernmentServiceChecklistItem');
  });

  it('defines purpose-specific acceptance without global acceptance boolean', () => {
    const block = extractEnumBlock(schema, 'EvidenceAcceptancePurpose');
    for (const purpose of EVIDENCE_ACCEPTANCE_PURPOSES) {
      expect(block).toContain(purpose);
    }
    const acceptanceBlock = schema.slice(
      schema.indexOf('model EvidencePurposeAcceptance'),
      schema.indexOf('model EvidenceQualityAssessment'),
    );
    expect(acceptanceBlock).toContain('purpose');
    expect(acceptanceBlock).not.toMatch(/\bisAccepted\s+Boolean/);
  });

  it('defines structured quality criteria without a single AI confidence score', () => {
    const block = extractEnumBlock(schema, 'EvidenceQualityCriterion');
    for (const criterion of EVIDENCE_QUALITY_CRITERIA) {
      expect(block).toContain(criterion);
    }
    const qualityBlock = schema.slice(schema.indexOf('model EvidenceQualityAssessment'));
    expect(qualityBlock).not.toContain('aiConfidence');
    expect(qualityBlock).not.toContain('qualityScore');
  });

  it('does not define Phase 7D evidence vault models', () => {
    for (const modelName of FORBIDDEN_PHASE_7D_MODELS) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
