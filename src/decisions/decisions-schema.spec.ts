import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DECISION_OUTCOME_CODES,
  DECISION_TYPE_LIFECYCLE_STATUSES,
  DECISIONS_MODEL_NAMES,
  FORBIDDEN_DECISION_CATALOG_FIELDS,
  PHASE_4_DECISION_REFERENCE_FIELDS,
  PHASE_7_DECISION_REFERENCE_FIELDS,
} from './decisions-schema.constants';

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

describe('Decision catalog schema coherence (Phase 8A)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 8A decision catalog models', () => {
    for (const modelName of DECISIONS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('does not define GovernmentDecision or IssuedInstrument models in Phase 8A', () => {
    expect(schema).not.toContain('model GovernmentDecision');
    expect(schema).not.toContain('model IssuedInstrument');
  });

  it('defines controlled decision type lifecycle states including ACTIVE and ACCEPTED', () => {
    const block = extractEnumBlock(schema, 'DecisionTypeLifecycleStatus');
    for (const status of DECISION_TYPE_LIFECYCLE_STATUSES) {
      expect(block).toContain(status);
    }
    expect(block).toContain('ACCEPTED');
    expect(block).toContain('ACTIVE');
  });

  it('defines all canonical decision outcome codes', () => {
    const block = extractEnumBlock(schema, 'DecisionOutcomeCode');
    for (const code of DECISION_OUTCOME_CODES) {
      expect(block).toContain(code);
    }
  });

  it('keeps decision type code unique', () => {
    const block = extractModelBlock(schema, 'DecisionTypeDefinition');
    expect(block).toMatch(/code\s+String\s+@unique/);
  });

  it('versions decision types with historical reconstruction support', () => {
    const block = extractModelBlock(schema, 'DecisionTypeVersion');
    expect(block).toContain('decisionTypeDefinitionId');
    expect(block).toMatch(/@@unique\(\[decisionTypeDefinitionId, version\]\)/);
    expect(block).toContain('supersededByVersionId');
  });

  it('references Phase 4 authority without duplicating governing source truth', () => {
    const block = extractModelBlock(schema, 'DecisionTypeVersion');
    for (const field of PHASE_4_DECISION_REFERENCE_FIELDS) {
      expect(block).toContain(field);
    }
    expect(block).not.toContain('classification');
    expect(block).not.toContain('lifecycleStatus');
  });

  it('references Phase 7 evidence controls without parallel evidence models', () => {
    const block = extractModelBlock(schema, 'DecisionTypeVersion');
    for (const field of PHASE_7_DECISION_REFERENCE_FIELDS) {
      expect(block).toContain(field);
    }
    expect(schema).not.toContain('model DecisionEvidencePacket');
  });

  it('links permissible outcomes explicitly rather than allowing free-form outcomes', () => {
    expect(schema).toContain('model DecisionTypePermissibleOutcome');
    const block = extractModelBlock(schema, 'DecisionTypePermissibleOutcome');
    expect(block).toContain('permissibleOutcomeDefinitionId');
    expect(block).toMatch(/@@unique\(\[decisionTypeVersionId, permissibleOutcomeDefinitionId\]\)/);
  });

  it('does not embed forbidden final decision fields in catalog models', () => {
    for (const modelName of ['DecisionTypeDefinition', 'DecisionTypeVersion']) {
      const block = extractModelBlock(schema, modelName);
      for (const field of FORBIDDEN_DECISION_CATALOG_FIELDS) {
        expect(block).not.toContain(field);
      }
import { FORBIDDEN_PHASE_8C_MODELS } from './decisions.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

const PHASE_8_MODELS = [
  'DecisionType',
  'DecisionTypeVersion',
  'DecisionReadinessAssessment',
  'DecisionParticipant',
  'DecisionPreparationRecord',
  'GovernmentDecision',
] as const;

const PHASE_8_ENUMS = [
  'DecisionTypeVersionStatus',
  'DecisionReadinessOutcome',
  'GovernmentDecisionStatus',
  'DecisionParticipantRole',
] as const;

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Decisions schema (Phase 8B)', () => {
  for (const modelName of PHASE_8_MODELS) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_8_ENUMS) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('includes DECIDED before ISSUED in case status lifecycle', () => {
    const caseStatusBlock = /enum CaseStatus \{[\s\S]*?\}/.exec(schema)?.[0] ?? '';
    expect(caseStatusBlock).toContain('DECIDED');
    expect(caseStatusBlock).toContain('ISSUED');
    expect(caseStatusBlock.indexOf('DECIDED')).toBeLessThan(caseStatusBlock.indexOf('ISSUED'));
  });

  it('GovernmentDecision has immutable snapshot fields', () => {
    const block = extractModelBlock(schema, 'GovernmentDecision');
    expect(block).toContain('integrityHash');
    expect(block).toContain('authorityEvaluationRecordId');
    expect(block).toContain('evidencePacketVersionId');
    expect(block).toContain('decisionReadinessAssessmentId');
    expect(block).not.toContain('DRAFT');
  });

  it('DecisionPreparationRecord is explicitly non-final', () => {
    const block = extractModelBlock(schema, 'DecisionPreparationRecord');
    expect(block).toContain('isNonFinal');
    expect(block).toContain('aiAssistanceMetadata');
  });

  it('does not define Phase 8C issuance models', () => {
    for (const model of FORBIDDEN_PHASE_8C_MODELS) {
      expect(schema).not.toContain(`model ${model}`);
    }
  });
});
