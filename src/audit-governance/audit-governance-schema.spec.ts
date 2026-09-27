import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AUDIT_GOVERNANCE_MODEL_NAMES,
  PROTECTED_AUDIT_LEDGER_RELATIONS,
} from './audit-governance.constants';

describe('S14 audit governance schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  for (const modelName of AUDIT_GOVERNANCE_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('keeps the government audit ledger append-only (no updatedAt)', () => {
    const block = /model GovernmentAuditLedgerEntry \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? '';
    expect(block).not.toContain('updatedAt');
  });

  it('documents hash chain stream boundary', () => {
    expect(schema).toContain('ledgerStreamKey');
    expect(schema).toContain('Hash chains are scoped per `ledgerStreamKey`');
  });

  for (const relation of PROTECTED_AUDIT_LEDGER_RELATIONS) {
    it(`protects ${relation.model}.${relation.field} with ${relation.onDelete}`, () => {
      const modelBlock =
        schema.match(new RegExp(`model ${relation.model} \\{[\\s\\S]*?\\n\\}`, 'g'))?.[0] ?? '';
      expect(modelBlock).toContain(relation.field);
      expect(modelBlock).toContain(`onDelete: ${relation.onDelete}`);
    });
  }
});
