import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INSTRUMENT_LIFECYCLE_EVENT_TYPES,
  PHASE_8G_ENUM_NAMES,
  PHASE_8G_MODEL_NAMES,
} from './instruments-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Phase 8G instrument lifecycle schema', () => {
  for (const modelName of PHASE_8G_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_8G_ENUM_NAMES) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const eventType of INSTRUMENT_LIFECYCLE_EVENT_TYPES) {
    it(`supports lifecycle event type ${eventType}`, () => {
      expect(schema).toContain(eventType);
    });
  }

  it('links lifecycle events to controlling decisions', () => {
    const eventBlock = extractModelBlock(schema, 'InstrumentLifecycleEvent');
    expect(eventBlock).toContain('controllingDecisionId');
    expect(eventBlock).toContain('InstrumentLifecycleDecision');
  });

  it('preserves instrument versions without overwrite', () => {
    const versionBlock = extractModelBlock(schema, 'OfficialInstrumentVersion');
    expect(versionBlock).toContain('supersededByVersionId');
    expect(versionBlock).toContain('isCurrentLifecycle');
  });

  it('tracks public verification status on instruments', () => {
    const instrumentBlock = extractModelBlock(schema, 'OfficialInstrument');
    expect(instrumentBlock).toContain('publicVerificationStatus');
    expect(instrumentBlock).toContain('publicVerificationToken');
    expect(instrumentBlock).toContain('lifecycleStatus');
  });

  it('distinguishes ABSEZ jurisdiction scope', () => {
    expect(schema).toContain('ABSEZ');
  });

  it('records review stay status without auto-stay default', () => {
    const reviewBlock = extractModelBlock(schema, 'DecisionReviewReference');
    expect(reviewBlock).toContain('stayStatus');
    expect(reviewBlock).toContain('@default(NONE)');
  });

  it('requires renewal current evidence', () => {
    const renewalBlock = extractModelBlock(schema, 'InstrumentRenewalRecord');
    expect(renewalBlock).toContain('currentEvidenceIds');
    expect(renewalBlock).toContain('priorApprovalReliedUpon');
    expect(renewalBlock).toContain('paymentReceived');
  });

  it('prevents ABSEZ revocation masquerading as national', () => {
    const revocationBlock = extractModelBlock(schema, 'InstrumentRevocationRecord');
    expect(revocationBlock).toContain('representsNationalRevocation');
  });
});
