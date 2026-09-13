import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PHASE_8D_MODEL_NAMES } from './decisions-issuance.constants';

describe('DecisionsIssuance schema boundaries (Phase 8D)', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  for (const modelName of PHASE_8D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName}\\b`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('does not store private key fields on credential reference model', () => {
    const modelBlock = schema.slice(
      schema.indexOf('model ElectronicSignatureCredentialReference'),
      schema.indexOf('model SignableInstrumentBinding'),
    );
    expect(modelBlock).not.toMatch(/privateKey/i);
    expect(modelBlock).not.toMatch(/secretKey/i);
  });

  it('defines signature record as append-only evidence store fields', () => {
    expect(schema).toContain('signatureValueReference');
    expect(schema).not.toMatch(/signatureValue\s+String/);
  });
});
