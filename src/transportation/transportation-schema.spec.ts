import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  TRANSPORTATION_FOUNDATION_ENUM_NAMES,
  TRANSPORTATION_FOUNDATION_MODEL_NAMES,
} from './transportation-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Transportation foundation schema', () => {
  for (const modelName of TRANSPORTATION_FOUNDATION_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of TRANSPORTATION_FOUNDATION_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links driver license applications to Case and Application without duplicating them', () => {
    expect(schema.match(/model Case \{/g)).toHaveLength(1);
    expect(schema.match(/model Application \{/g)).toHaveLength(1);
    const block = /model DriverLicenseApplicationProfile \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('caseId');
    expect(block).toContain('applicationId');
    expect(block).toContain('doesNotIssueDriverLicense');
  });

  it('preserves vehicle ownership history separately from current ownership', () => {
    expect(schema).toContain('model VehicleOwnershipHistory');
    expect(schema).toContain('model VehicleOwnershipRecord');
    expect(schema).toContain('preservesPriorOwnershipHistory');
  });

  it('stores driver medical references without diagnosis fields', () => {
    const block = /model DriverMedicalRequirementReference \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('determinationReferenceToken');
    expect(block).toContain('storesDiagnosis');
    expect(block).not.toContain('diagnosis');
  });

  it('links vehicle inspections to inspection records without implicit registration revocation', () => {
    const block = /model VehicleInspection \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('inspectionRecordId');
    expect(block).toContain('inspectionResultDoesNotRevokeRegistration');
  });
});
