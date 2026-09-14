import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7D_MODELS } from './evidence.constants';
import {
  EVIDENCE_ACCEPTANCE_PURPOSES,
  EVIDENCE_MODEL_NAMES,
  EVIDENCE_QUALITY_CRITERIA,
  EVIDENCE_RECORD_STATUSES,
  EVIDENCE_VERIFICATION_CATEGORIES,
  GOVERNMENT_COMMUNICATION_CATEGORIES,
  INSPECTION_FINDING_CLASSIFICATIONS,
  PHASE_7D_ATTRIBUTABLE_MODEL_NAMES,
} from './evidence-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
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

describe('Evidence schema coherence (Phase 7D)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 7D attributable models exactly once', () => {
    for (const modelName of PHASE_7D_ATTRIBUTABLE_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines government communication categories without collapsing approval semantics', () => {
    const block = extractEnumBlock(schema, 'GovernmentCommunicationCategory');
    for (const category of GOVERNMENT_COMMUNICATION_CATEGORIES) {
      expect(block).toContain(category);
    }
    expect(block).toContain('ACKNOWLEDGMENT');
    expect(block).toContain('CONCURRENCE');
    expect(block).not.toContain('APPROVAL');
  });

  it('links attributable records to Case without a global approved boolean', () => {
    const departmentalBlock = schema.slice(
      schema.indexOf('model DepartmentalReviewRecord'),
      schema.indexOf('model DepartmentalReviewEvidence'),
    );
    expect(departmentalBlock).toContain('caseId');
    expect(departmentalBlock).not.toMatch(/\bapproved\s+Boolean/);
  });

  it('defines inspection finding classifications separately from violation status', () => {
    const block = extractEnumBlock(schema, 'InspectionFindingClassification');
    for (const classification of INSPECTION_FINDING_CLASSIFICATIONS) {
      expect(block).toContain(classification);
    }
  });

  it('defines append-only custody events without scientific validity claims', () => {
    const custodyBlock = extractModelBlock(schema, 'EvidenceCustodyEvent');
    expect(custodyBlock).toContain('eventType');
    expect(custodyBlock).not.toContain('scientificValidity');
    expect(custodyBlock).not.toContain('validated');
  });
});
