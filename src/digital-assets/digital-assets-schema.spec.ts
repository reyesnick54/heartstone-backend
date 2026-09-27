import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DIGITAL_ASSETS_INVARIANTS } from './digital-assets.constants';
import {
  DIGITAL_ASSETS_FOUNDATION_ENUM_NAMES,
  DIGITAL_ASSETS_FOUNDATION_MODEL_NAMES,
} from './digital-assets-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Digital assets schema guard', () => {
  for (const modelName of DIGITAL_ASSETS_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of DIGITAL_ASSETS_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links regulated entities to canonical Organization without duplicate company tables', () => {
    expect(schema).toMatch(
      /model DigitalAssetsRegulatedEntityReference[\s\S]*organizationId[\s\S]*@relation\("DigitalAssetsRegulatedEntityOrganization"/,
    );
    expect(schema).not.toMatch(/model DigitalAssetsOrganization\b/);
    expect(schema).not.toMatch(/model DigitalAssetsGenericLicenceEngine\b/);
  });

  it('keeps beneficial ownership as a reference to corporate registry declarations', () => {
    expect(schema).toMatch(
      /model DigitalAssetsBeneficialOwnershipReference[\s\S]*corporateBeneficialOwnershipDeclarationId/,
    );
  });

  it('consumes platform blockchain verification separately from regulatory records', () => {
    expect(schema).toMatch(
      /model DigitalAssetsConfiguration[\s\S]*consumesPlatformBlockchainVerification\s+Boolean\s+@default\(true\)/,
    );
  });

  it('documents digital-assets invariants in constants', () => {
    expect(DIGITAL_ASSETS_INVARIANTS.noDuplicateGenericLicenceEngine).toBe(true);
    expect(DIGITAL_ASSETS_INVARIANTS.organizationNotDuplicated).toBe(true);
  });
});
