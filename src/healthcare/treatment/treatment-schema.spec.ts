import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  TREATMENT_FOUNDATION_ENUM_NAMES,
  TREATMENT_FOUNDATION_MODEL_NAMES,
} from './treatment-schema.constants';

const schemaPath = join(__dirname, '../../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Healthcare treatment foundation schema', () => {
  for (const modelName of TREATMENT_FOUNDATION_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of TREATMENT_FOUNDATION_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links treatment applications to Case and Application without authorizing treatment', () => {
    const block = /model TreatmentApplication \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('caseId');
    expect(block).toContain('applicationId');
    expect(block).toContain('doesNotAuthorizeTreatment');
    expect(block).toContain('doesNotEqualClinicalSuitability');
  });

  it('stores clinical eligibility reviews with professional license context', () => {
    const block = /model TreatmentEligibilityReview \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('professionalLicenseNumber');
    expect(block).toContain('professionalLicenseAuthorityCode');
    expect(block).toContain('decisionBasisEvidenceReference');
    expect(block).toContain('governmentAdministrativeEvaluationId');
  });

  it('integrates ServiceAppointment through treatment appointment references', () => {
    expect(schema).toContain('model TreatmentAppointmentReference');
    expect(schema).toContain('serviceAppointmentId');
    expect(schema).toContain('HealthcareAppointmentPrivacyClassification');
  });
});
