import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CLINICAL_RESEARCH_INVARIANTS } from './clinical-research.constants';
import {
  CLINICAL_RESEARCH_FOUNDATION_ENUM_NAMES,
  CLINICAL_RESEARCH_FOUNDATION_MODEL_NAMES,
} from './clinical-research-schema.constants';

const schemaPath = join(__dirname, '../../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Clinical research schema guard', () => {
  for (const modelName of CLINICAL_RESEARCH_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of CLINICAL_RESEARCH_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('keeps patient interest distinct from enrollment', () => {
    expect(schema).toMatch(
      /model ClinicalTrialInterest[\s\S]*interestIsNotEnrollment\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps consent signatures distinct from enrollment', () => {
    expect(schema).toMatch(
      /model ClinicalTrialConsentSignature[\s\S]*consentIsNotEnrollment\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps ethics approval distinct from regulatory approval', () => {
    expect(schema).toMatch(
      /model ResearchEthicsApproval[\s\S]*ethicsIsNotRegulatoryApproval\s+Boolean\s+@default\(true\)/,
    );
    expect(schema).toMatch(
      /model ClinicalRegulatoryApproval[\s\S]*regulatoryIsNotEthicsApproval\s+Boolean\s+@default\(true\)/,
    );
  });

  it('forbids sponsor self-approval at the schema level', () => {
    expect(schema).toMatch(
      /model ResearchEthicsApproval[\s\S]*sponsorSelfApprovalForbidden\s+Boolean\s+@default\(true\)/,
    );
  });

  it('documents clinical research invariants in constants', () => {
    expect(CLINICAL_RESEARCH_INVARIANTS.protocolVersionImmutableAfterActivation).toBe(true);
    expect(CLINICAL_RESEARCH_INVARIANTS.participantDataIsolated).toBe(true);
  });
});
