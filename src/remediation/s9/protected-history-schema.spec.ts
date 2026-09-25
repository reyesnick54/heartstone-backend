import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROTECTED_HISTORY_RELATIONS } from './protected-history-schema.constants';

const schemaPath = join(__dirname, '../../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(modelName: string): string {
  const start = schema.indexOf(`model ${modelName} {`);
  if (start < 0) {
    throw new Error(`Model ${modelName} not found`);
  }
  const end = schema.indexOf('\n}', start);
  return schema.slice(start, end);
}

describe('S9 protected history schema guard', () => {
  for (const relation of PROTECTED_HISTORY_RELATIONS) {
    it(`${relation.model}.${relation.field} uses onDelete ${relation.onDelete}`, () => {
      const block = extractModelBlock(relation.model);
      const pattern = new RegExp(
        `${relation.field}[\\s\\S]*@relation\\([\\s\\S]*onDelete:\\s*${relation.onDelete}`,
      );
      expect(block).toMatch(pattern);
    });
  }

  it('links civil registry vital records to foundation entry and vital event', () => {
    const block = extractModelBlock('CivilRegistryVitalRecord');
    expect(block).toContain('vitalEventId');
    expect(block).toContain('civilRegistryEntryId');
  });

  it('links legacy property parcels to cadastre land parcels', () => {
    const block = extractModelBlock('PropertyParcel');
    expect(block).toContain('landParcelId');
  });
});
