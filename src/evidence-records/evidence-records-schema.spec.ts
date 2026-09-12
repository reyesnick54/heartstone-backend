import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7C_MODELS } from './evidence-records.constants';
import {
  EVIDENCE_RECORDS_ENUM_NAMES,
  EVIDENCE_RECORDS_MODEL_NAMES,
  MALWARE_SCAN_STATUSES,
  SECURITY_CLASSIFICATIONS,
} from './evidence-records-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Evidence records schema (Phase 7B)', () => {
  for (const modelName of EVIDENCE_RECORDS_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of EVIDENCE_RECORDS_ENUM_NAMES) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('does not implement Phase 7C models yet', () => {
    for (const model of FORBIDDEN_PHASE_7C_MODELS) {
      expect(schema).not.toContain(`model ${model}`);
    }
  });

  it('stores content outside PostgreSQL', () => {
    const versionBlock = extractModelBlock(schema, 'DocumentVersion');
    expect(versionBlock).toContain('storageObjectKey');
    expect(versionBlock).not.toMatch(/content\s+Bytes/);
    expect(versionBlock).not.toMatch(/binary\s+/);
  });

  it('defaults authenticity to NOT_EVALUATED', () => {
    const versionBlock = extractModelBlock(schema, 'DocumentVersion');
    expect(versionBlock).toContain('authenticityStatus');
    expect(versionBlock).toContain('NOT_EVALUATED');
  });

  it('supports required malware scan statuses', () => {
    for (const status of MALWARE_SCAN_STATUSES) {
      expect(schema).toContain(status);
    }
  });

  it('supports required security classifications', () => {
    for (const classification of SECURITY_CLASSIFICATIONS) {
      expect(schema).toContain(classification);
    }
  });

  it('prepares Phase 7 stable references on Case', () => {
    const caseBlock = extractModelBlock(schema, 'Case');
    expect(caseBlock).toContain('documentRegisterReference');
    expect(caseBlock).toContain('masterAdministrativeFileReference');
  });
});
