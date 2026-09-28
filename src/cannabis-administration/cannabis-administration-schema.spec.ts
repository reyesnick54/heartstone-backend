import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CANNABIS_INVARIANTS } from './cannabis-administration.constants';
import {
  CANNABIS_FOUNDATION_ENUM_NAMES,
  CANNABIS_FOUNDATION_MODEL_NAMES,
} from './cannabis-administration-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Cannabis administration schema guard', () => {
  for (const modelName of CANNABIS_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of CANNABIS_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links regulated entities to canonical organizations', () => {
    expect(schema).toMatch(
      /model CannabisRegulatedEntityReference[\s\S]*organizationId\s+String[\s\S]*@relation\("CannabisRegulatedEntityOrganization"/,
    );
  });

  it('defaults delegated licence function to INACTIVE', () => {
    expect(schema).toMatch(
      /delegatedLicenceFunctionActivation\s+CannabisDelegatedLicenceFunctionActivation\s+@default\(INACTIVE\)/,
    );
  });

  it('defaults service operational activation to INACTIVE', () => {
    expect(schema).toMatch(
      /serviceOperationalActivation\s+CannabisServiceOperationalActivation\s+@default\(INACTIVE\)/,
    );
  });

  it('references facility sites without duplicating land parcels', () => {
    expect(schema).toMatch(
      /model CannabisFacilitySiteReference[\s\S]*landParcelId\s+String\?[\s\S]*doesNotCreateLandOrPlanningRecords\s+Boolean\s+@default\(true\)/,
    );
  });

  it('documents cannabis invariants in constants', () => {
    expect(CANNABIS_INVARIANTS.noUnsupportedRegulatoryEngines).toBe(true);
  });
});
