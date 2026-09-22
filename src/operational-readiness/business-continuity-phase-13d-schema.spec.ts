import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONTINUITY_SCENARIO_TYPES,
  PHASE_13D_BOUNDARY_DISCLAIMER,
} from './business-continuity.constants';
import {
  PHASE_13D_ENUM_NAMES,
  PHASE_13D_MODEL_NAMES,
} from './business-continuity-schema.constants';

const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('Phase 13D production readiness schema', () => {
  for (const modelName of PHASE_13D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13D_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const scenario of CONTINUITY_SCENARIO_TYPES) {
    it(`supports continuity scenario ${scenario}`, () => {
      expect(schema).toContain(scenario);
    });
  }

  it('defaults backup recoverability to UNVERIFIED', () => {
    const block = /model BackupDefinition \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toMatch(
      /recoverabilityStatus\s+BackupRecoverabilityStatus\s+@default\(UNVERIFIED\)/,
    );
  });

  it('requires manual operation authorization expiration', () => {
    const block = /model ManualOperationAuthorization \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('expiresAt                    DateTime');
    expect(block).not.toContain('expiresAt                    DateTime?');
  });

  it('preserves manual original in reconciliation records', () => {
    const block = /model ManualDigitalReconciliation \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toMatch(/manualOriginalPreserved\s+Boolean/);
    expect(block).toMatch(/manualRecordReference\s+String/);
  });

  it('supports TBD configuration confirmation status', () => {
    expect(schema).toContain('enum ConfigurationConfirmationStatus');
    expect(schema).toContain('TBD');
  });

  it('documents phase 13D boundary scope', () => {
    expect(PHASE_13D_BOUNDARY_DISCLAIMER).toContain('Emergency authority is time-bounded');
  });
});
