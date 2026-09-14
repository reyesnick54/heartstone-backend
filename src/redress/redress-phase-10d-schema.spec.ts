import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ADMINISTRATIVE_CORRECTION_CATEGORIES,
  AUTOMATION_CHALLENGE_GROUNDS,
  AUTOMATION_CHALLENGE_REMEDIES,
} from './redress.constants';
import { PHASE_10D_ENUM_NAMES, PHASE_10D_MODEL_NAMES } from './redress-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 10D redress schema', () => {
  for (const modelName of PHASE_10D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_10D_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const category of ADMINISTRATIVE_CORRECTION_CATEGORIES) {
    it(`supports administrative correction category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  for (const ground of AUTOMATION_CHALLENGE_GROUNDS) {
    it(`supports automation challenge ground ${ground}`, () => {
      expect(schema).toContain(ground);
    });
  }

  for (const remedy of AUTOMATION_CHALLENGE_REMEDIES) {
    it(`supports automation challenge remedy ${remedy}`, () => {
      expect(schema).toContain(remedy);
    });
  }

  it('links administrative correction to Phase 7 record correction without erasure', () => {
    expect(schema).toContain('recordCorrectionId');
    expect(schema).toContain('originalRecordSnapshot');
    expect(schema).toContain('correctedRecordReference');
    expect(schema).toContain('downstreamRecordsRequiringUpdate');
  });

  it('preserves automation explanation with redaction support', () => {
    expect(schema).toContain('protectedRedactedElements');
    expect(schema).toContain('explanationSummary');
    expect(schema).toContain('systemIdentifier');
    expect(schema).toContain('version');
  });

  it('preserves historical output when excluding faulty automation output', () => {
    expect(schema).toContain('historicalOutputPreserved');
    expect(schema).toContain('excludedOutputReference');
  });

  it('routes substantive correction attempts to alternate redress', () => {
    expect(schema).toContain('routedToRoute');
    expect(schema).toContain('routedRouteGuidance');
    expect(schema).toContain('ROUTED_TO_ALTERNATE_REDRESS');
  });
});
