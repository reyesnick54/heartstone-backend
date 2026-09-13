import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  it('includes DECIDED case status for post-decision workflow', () => {
    const caseStatusBlock = /enum CaseStatus \{[\s\S]*?\}/.exec(schema)?.[0] ?? '';
    expect(caseStatusBlock).toContain('DECIDED');
    expect(caseStatusBlock).not.toContain('ISSUED');
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
