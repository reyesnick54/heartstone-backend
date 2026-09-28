import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CARBON_MANAGEMENT_INVARIANTS } from './carbon-management.constants';
import {
  CARBON_MANAGEMENT_FOUNDATION_ENUM_NAMES,
  CARBON_MANAGEMENT_FOUNDATION_MODEL_NAMES,
} from './carbon-management-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Carbon management schema guard', () => {
  for (const modelName of CARBON_MANAGEMENT_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of CARBON_MANAGEMENT_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links carbon projects to canonical Organization without duplicate company tables', () => {
    expect(schema).toMatch(
      /model CarbonProjectReference[\s\S]*organizationId[\s\S]*@relation\("CarbonProjectOrganization"/,
    );
    expect(schema).not.toMatch(/model CarbonManagementOrganization\b/);
    expect(schema).not.toMatch(/model CarbonGenericLicenceEngine\b/);
  });

  it('links carbon projects to StrategicProjectProfile without merging legal decisions', () => {
    expect(schema).toMatch(
      /model CarbonProjectReference[\s\S]*strategicProjectProfileId[\s\S]*doesNotInferApprovalFromStrategicProject\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps market mechanics as configuration extension points', () => {
    expect(schema).toMatch(
      /model CarbonManagementConfiguration[\s\S]*marketMechanicsExtensionModeCode\s+String\s+@default\("NOT_CONFIGURED"\)/,
    );
    expect(schema).toMatch(
      /model CarbonManagementConfiguration[\s\S]*configurableCreditUnitTaxonomy\s+Json\s+@default\("\[\]"\)/,
    );
  });

  it('documents carbon-management invariants in constants', () => {
    expect(CARBON_MANAGEMENT_INVARIANTS.noDuplicateGenericLicenceEngine).toBe(true);
    expect(CARBON_MANAGEMENT_INVARIANTS.organizationNotDuplicated).toBe(true);
  });
});
