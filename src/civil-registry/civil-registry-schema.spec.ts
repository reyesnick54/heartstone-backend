import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CIVIL_REGISTRY_EVENT_TYPES,
  CIVIL_REGISTRY_MODEL_NAMES,
  CIVIL_REGISTRY_RECORD_STATUSES,
} from './civil-registry-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Civil registry schema coherence', () => {
  const schema = readSchema();

  it('defines civil registry models', () => {
    for (const modelName of CIVIL_REGISTRY_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines controlled event and record status enums', () => {
    const eventBlock = schema.slice(
      schema.indexOf('enum CivilRegistryEventType'),
      schema.indexOf('enum CivilRegistryRecordStatus'),
    );
    for (const eventType of CIVIL_REGISTRY_EVENT_TYPES) {
      expect(eventBlock).toContain(eventType);
    }

    const statusBlock = schema.slice(
      schema.indexOf('enum CivilRegistryRecordStatus'),
      schema.indexOf('enum CivilRegistrySubmissionStatus'),
    );
    for (const status of CIVIL_REGISTRY_RECORD_STATUSES) {
      expect(statusBlock).toContain(status);
    }
  });

  it('versioned vital records preserve supersession chain', () => {
    const block = schema.slice(
      schema.indexOf('model CivilRegistryVitalRecordVersion'),
      schema.indexOf('model CivilRegistryEventSubmission'),
    );
    expect(block).toContain('supersedesVersionId');
    expect(block).toMatch(/versionNumber\s+Int/);
  });
});
