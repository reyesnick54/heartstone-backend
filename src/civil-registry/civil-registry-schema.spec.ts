import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CIVIL_REGISTRY_ACCESS_CLASSIFICATIONS,
  VITAL_EVENT_TYPES,
} from './civil-registry.constants';
import {
  CIVIL_REGISTRY_ENUM_NAMES,
  CIVIL_REGISTRY_MODEL_NAMES,
} from './civil-registry-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Civil registry schema guard', () => {
  for (const modelName of CIVIL_REGISTRY_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of CIVIL_REGISTRY_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const classification of CIVIL_REGISTRY_ACCESS_CLASSIFICATIONS) {
    it(`supports access classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }

  for (const eventType of VITAL_EVENT_TYPES) {
    it(`supports vital event type ${eventType}`, () => {
      expect(schema).toContain(eventType);
    });
  }

  it('links civil person records optionally to platform Person without merging domains', () => {
    expect(schema).toMatch(/personId\s+String\?\s+@db\.Uuid/);
    expect(schema).toMatch(/civilPersonRecords\s+CivilPersonRecord\[\]/);
  });

  it('links service-pack vital records to foundation vital events and entries', () => {
    expect(schema).toMatch(
      /model CivilRegistryVitalRecord[\s\S]*vitalEventId[\s\S]*civilRegistryEntryId/,
    );
  });

  it('requires authority evaluation for official civil registry entries', () => {
    expect(schema).toMatch(
      /model CivilRegistryEntry[\s\S]*authorityEvaluationRecordId String\s+@db\.Uuid/,
    );
  });
});
