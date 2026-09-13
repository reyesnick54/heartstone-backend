import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_8D_MODELS } from './decisions.constants';
import {
  DECISION_CONDITION_STATUSES,
  DECISION_CONDITION_TYPES,
  DECISION_NOTICE_RIGHT_TYPES,
  PHASE_8C_ENUM_NAMES,
  PHASE_8C_MODEL_NAMES,
} from './decisions-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Decisions schema coherence (Phase 8C)', () => {
  for (const modelName of PHASE_8C_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_8C_ENUM_NAMES) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('does not implement Phase 8D issuance models yet', () => {
    for (const model of FORBIDDEN_PHASE_8D_MODELS) {
      expect(schema).not.toContain(`model ${model}`);
    }
  });

  it('stores approved condition and reason text hashes', () => {
    const conditionBlock = extractModelBlock(schema, 'DecisionCondition');
    expect(conditionBlock).toContain('approvedTextHash');
    const reasonBlock = extractModelBlock(schema, 'DecisionReason');
    expect(reasonBlock).toContain('approvedTextHash');
  });

  it('links GovernmentDecision to Case without embedding outcome on Case', () => {
    const caseBlock = extractModelBlock(schema, 'Case');
    expect(caseBlock).toContain('governmentDecisions');
    expect(caseBlock).not.toContain('decisionOutcome');
    expect(caseBlock).not.toContain('refusalReason');
  });

  it('supports all configured condition types and statuses', () => {
    for (const value of DECISION_CONDITION_TYPES) {
      expect(schema).toContain(value);
    }
    for (const value of DECISION_CONDITION_STATUSES) {
      expect(schema).toContain(value);
    }
  });

  it('supports structured notice rights without inventing routes in schema', () => {
    for (const value of DECISION_NOTICE_RIGHT_TYPES) {
      expect(schema).toContain(value);
    }
    const noticeRightBlock = extractModelBlock(schema, 'DecisionNoticeRight');
    expect(noticeRightBlock).toContain('routeCode');
  });

  it('separates DecisionNotice from instrument issuance', () => {
    const noticeBlock = extractModelBlock(schema, 'DecisionNotice');
    expect(noticeBlock).toContain('noticeStatus');
    expect(noticeBlock).not.toContain('instrument');
    expect(schema).not.toContain('model IssuedLicense');
  });
});
