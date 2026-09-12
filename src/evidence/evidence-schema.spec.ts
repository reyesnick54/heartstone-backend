import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

describe('Evidence records schema coherence (Phase 7F)', () => {
  const schema = readSchema();

  it('defines correction, integrity, and access models exactly once', () => {
    for (const modelName of [
      'RecordCorrection',
      'RecordIntegrityEvent',
      'RecordAccessEvent',
      'MasterAdministrativeFile',
      'EvidencePacket',
      'EvidencePacketVersion',
    ]) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('keeps integrity and access events append-only', () => {
    const integrityBlock = extractModelBlock(schema, 'RecordIntegrityEvent');
    const accessBlock = extractModelBlock(schema, 'RecordAccessEvent');
    expect(integrityBlock).not.toContain('updatedAt');
    expect(accessBlock).not.toContain('updatedAt');
  });

  it('defines correction status lifecycle without erasure semantics', () => {
    const block = extractModelBlock(schema, 'RecordCorrection');
    expect(block).toContain('replacementRecordReference');
    expect(block).toContain('targetVersionId');
    expect(block).toContain('reassessmentRequired');
  });
});
