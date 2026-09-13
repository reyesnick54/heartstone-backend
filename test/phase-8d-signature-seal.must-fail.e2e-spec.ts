import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_8D_MODEL_NAMES,
  SIGNATURE_SEAL_BOUNDARY_DISCLAIMER,
} from '../src/decisions-issuance/decisions-issuance.constants';

describe('Phase 8D must-fail architectural invariants', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it('declares Phase 8D boundary disclaimer', () => {
    expect(SIGNATURE_SEAL_BOUNDARY_DISCLAIMER).toMatch(
      /credential does not create institutional signing authority/i,
    );
  });

  it('does not add Phase 8E issuance models in Phase 8D slice', () => {
    expect(schema).not.toContain('model GovernmentDecision');
    expect(schema).not.toContain('model IssuedLicense');
  });

  it('defines all Phase 8D models without duplicate roots', () => {
    for (const modelName of PHASE_8D_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\b`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('never stores raw private key columns on signature entities', () => {
    const phase8d = schema.slice(schema.indexOf('Phase 8D: Electronic Signature'));
    expect(phase8d).not.toMatch(/\bprivateKey\b/);
    expect(phase8d).not.toMatch(/\bsecretKey\b/);
  });
});
