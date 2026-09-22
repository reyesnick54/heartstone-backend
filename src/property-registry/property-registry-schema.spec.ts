import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROPERTY_REGISTRY_ACCESS_CLASSIFICATIONS } from './property-registry.constants';
import {
  PROPERTY_REGISTRY_ENUM_NAMES,
  PROPERTY_REGISTRY_MODEL_NAMES,
} from './property-registry-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Property registry schema guard', () => {
  for (const modelName of PROPERTY_REGISTRY_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PROPERTY_REGISTRY_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const classification of PROPERTY_REGISTRY_ACCESS_CLASSIFICATIONS) {
    it(`supports access classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }

  it('requires authority evaluation for official property registry entries', () => {
    expect(schema).toMatch(
      /model PropertyRegistryEntry[\s\S]*authorityEvaluationRecordId String\s+@db\.Uuid/,
    );
  });

  it('stores parcel geometry as external references rather than embedded GIS geometry', () => {
    expect(schema).toMatch(
      /model ParcelGeometryReference[\s\S]*geometryReference[\s\S]*coordinateSystem/,
    );
    expect(schema).not.toMatch(/model LandParcel[\s\S]*geometry\s+Unsupported\("geometry"\)/);
  });

  it('versions title records without overwriting prior title versions', () => {
    expect(schema).toMatch(/model TitleVersion[\s\S]*supersededAt/);
    expect(schema).toMatch(/model PropertyInterestHistory/);
  });
});
