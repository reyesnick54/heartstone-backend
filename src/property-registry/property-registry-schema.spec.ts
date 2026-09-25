import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROPERTY_REGISTRY_ACCESS_CLASSIFICATIONS } from './property-registry.constants';
import {
  CADASTRE_PROPERTY_REGISTRY_ENUM_NAMES,
  CADASTRE_PROPERTY_REGISTRY_MODEL_NAMES,
  PHASE_PROPERTY_REGISTRY_ENUM_NAMES,
  PHASE_PROPERTY_REGISTRY_MODEL_NAMES,
} from './property-registry-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Property registry phase schema guard', () => {
  for (const modelName of PHASE_PROPERTY_REGISTRY_MODEL_NAMES) {
    it(`defines phase model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_PROPERTY_REGISTRY_ENUM_NAMES) {
    it(`defines phase enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }
});

describe('Property registry cadastre schema guard', () => {
  for (const modelName of CADASTRE_PROPERTY_REGISTRY_MODEL_NAMES) {
    it(`defines cadastre model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of CADASTRE_PROPERTY_REGISTRY_ENUM_NAMES) {
    it(`defines cadastre enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const classification of PROPERTY_REGISTRY_ACCESS_CLASSIFICATIONS) {
    it(`supports access classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }

  it('links legacy property parcels to cadastre land parcels', () => {
    expect(schema).toMatch(/model PropertyParcel[\s\S]*landParcelId/);
  });

  it('requires authority evaluation for official property registry entries', () => {
    expect(schema).toMatch(
      /model PropertyRegistryEntry[\s\S]*authorityEvaluationRecordId String\s+@db\.Uuid/,
    );
  });

  it('stores parcel geometry as external references rather than embedded GIS geometry', () => {
    expect(schema).toMatch(
      /model ParcelGeometryReference[\s\S]*geometryReference[\s\S]*coordinateSystem/,
    );
  });
});
