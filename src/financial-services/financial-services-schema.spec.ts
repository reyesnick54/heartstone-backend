import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FINANCIAL_SERVICES_INVARIANTS } from './financial-services.constants';
import {
  FINANCIAL_SERVICES_FOUNDATION_ENUM_NAMES,
  FINANCIAL_SERVICES_FOUNDATION_MODEL_NAMES,
} from './financial-services-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Financial services schema guard', () => {
  for (const modelName of FINANCIAL_SERVICES_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of FINANCIAL_SERVICES_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links regulated entities to canonical organizations', () => {
    expect(schema).toMatch(
      /model FinancialRegulatedEntityProfile[\s\S]*organizationId\s+String[\s\S]*@relation\("FinancialRegulatedEntityOrganization"/,
    );
  });

  it('keeps licence application profiles from issuing at link time', () => {
    expect(schema).toMatch(
      /model FinancialLicenceApplicationProfile[\s\S]*doesNotIssueLicence\s+Boolean\s+@default\(true\)/,
    );
  });

  it('defaults delegated licence function to INACTIVE', () => {
    expect(schema).toMatch(
      /delegatedLicenceFunctionActivation\s+FinancialDelegatedFunctionActivation\s+@default\(INACTIVE\)/,
    );
  });

  it('references beneficial ownership without duplicating corporate registry tables', () => {
    expect(schema).toContain('model FinancialBeneficialOwnershipLinkage');
    expect(schema).toContain('corporateBeneficialOwnershipDeclarationId');
  });

  it('documents financial services invariants in constants', () => {
    expect(FINANCIAL_SERVICES_INVARIANTS.delegatedInactiveBlocksIssuance).toBe(true);
    expect(FINANCIAL_SERVICES_INVARIANTS.externalDeterminationNotAbsezApproval).toBe(true);
  });
});
