import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FEE_ASSESSMENT_STATUSES,
  FEE_CALCULATION_METHODS,
  FEE_SCHEDULE_LIFECYCLE_STATUSES,
  INVOICE_STATUSES,
  PHASE_11A_ENUM_NAMES,
  PHASE_11A_MODEL_NAMES,
} from './financial-administration-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 11A financial administration schema', () => {
  for (const modelName of PHASE_11A_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11A_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const status of FEE_SCHEDULE_LIFECYCLE_STATUSES) {
    it(`supports fee schedule lifecycle status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const method of FEE_CALCULATION_METHODS) {
    it(`supports fee calculation method ${method}`, () => {
      expect(schema).toContain(method);
    });
  }

  for (const status of INVOICE_STATUSES) {
    it(`supports invoice status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const status of FEE_ASSESSMENT_STATUSES) {
    it(`supports fee assessment status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  it('links fee schedule items to government service fee definitions without duplicating catalog', () => {
    const itemBlock = /model FeeScheduleItem \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(itemBlock).toContain('governmentServiceFeeDefinitionId');
    expect(schema.match(/model GovernmentServiceFeeDefinition \{/g)).toHaveLength(1);
  });

  it('stores monetary amounts as integer cents', () => {
    const assessmentBlock = /model FeeAssessment \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(assessmentBlock).toContain('subtotalCents');
    expect(assessmentBlock).toContain('totalCents');
    expect(assessmentBlock).not.toContain('subtotal Float');
  });

  it('pins fee schedule version on assessments', () => {
    const assessmentBlock = /model FeeAssessment \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(assessmentBlock).toContain('feeScheduleVersionId');
    expect(assessmentBlock).toContain('integrityHash');
  });

  it('links financial records to master administrative file', () => {
    const assessmentBlock = /model FeeAssessment \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    const invoiceBlock = /model Invoice \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(assessmentBlock).toContain('masterAdministrativeFileId');
    expect(invoiceBlock).toContain('masterAdministrativeFileId');
  });
});
