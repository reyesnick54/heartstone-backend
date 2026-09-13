import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  OFFICIAL_INSTRUMENT_KINDS,
  PHASE_8E_MODEL_NAMES,
} from './decisions-issuance-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Decisions issuance schema coherence (Phase 8E)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 8E models exactly once', () => {
    for (const modelName of PHASE_8E_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all official instrument kinds', () => {
    const block = (/enum OfficialInstrumentKind\s*\{([^}]*)\}/s.exec(schema))?.[1] ?? '';
    for (const kind of OFFICIAL_INSTRUMENT_KINDS) {
      expect(block).toContain(kind);
    }
  });

  it('adds ISSUED case status for post-issuance transition only', () => {
    const block = (/enum CaseStatus\s*\{([^}]*)\}/s.exec(schema))?.[1] ?? '';
    expect(block).toContain('ISSUED');
  });

  it('adds INSTRUMENT_ISSUED case event without bare ISSUED event type', () => {
    const block = (/enum CaseEventType\s*\{([^}]*)\}/s.exec(schema))?.[1] ?? '';
    expect(block).toContain('INSTRUMENT_ISSUED');
    expect(block).not.toMatch(/^\s*ISSUED\s*$/m);
  });

  it('does not permit client-chosen instrument numbers on OfficialInstrument create fields', () => {
    const block = (/model OfficialInstrument\s*\{([^}]*)\}/s.exec(schema))?.[1] ?? '';
    expect(block).toContain('instrumentNumber');
    expect(block).toContain('PENDING_ISSUANCE');
  });
});
