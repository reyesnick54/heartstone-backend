import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_12A_ENUM_NAMES,
  PHASE_12A_MODEL_NAMES,
  PHASE_12C_ENUM_NAMES,
  PHASE_12C_MODEL_NAMES,
  STRATEGIC_PROJECT_DEPENDENCY_TYPES,
  STRATEGIC_PROJECT_LIFECYCLE_STAGES,
} from './intelligence.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 12A performance claim schema', () => {
  for (const modelName of PHASE_12A_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12A_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('requires claim review by default', () => {
    expect(schema).toContain('requiresClaimReview');
    expect(schema).toContain('isApplicantAssertion');
    expect(schema).toContain('independentVerificationRefs');
  });
});

describe('Phase 12C strategic project schema', () => {
  for (const modelName of PHASE_12C_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12C_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const stage of STRATEGIC_PROJECT_LIFECYCLE_STAGES) {
    it(`supports lifecycle stage ${stage}`, () => {
      expect(schema).toContain(stage);
    });
  }

  for (const dependencyType of STRATEGIC_PROJECT_DEPENDENCY_TYPES) {
    it(`supports dependency type ${dependencyType}`, () => {
      expect(schema).toContain(dependencyType);
    });
  }

  it('links economic claims to PerformanceClaim', () => {
    expect(schema).toContain('performanceClaimId');
    expect(schema).toContain('PerformanceClaim');
  });

  it('requires institutional state reference on stage records', () => {
    expect(schema).toContain('institutionalStateReference');
    expect(schema).toContain('doesNotInferApproval');
  });

  it('preserves milestone status distinctions', () => {
    expect(schema).toContain('PLANNED');
    expect(schema).toContain('REPORTED');
    expect(schema).toContain('VERIFIED');
    expect(schema).toContain('COMPLETED');
  });

  it('tracks capital evidence classifications without auto-escalation fields', () => {
    expect(schema).toContain('CapitalEvidenceClassification');
    expect(schema).toContain('VERIFIED_DEPLOYED');
    expect(schema).not.toContain('autoEscalateCapital');
  });

  it('tracks employment forecast separately from verified employment', () => {
    expect(schema).toContain('FORECAST');
    expect(schema).toContain('ACTIVE_VERIFIED');
  });

  it('tracks infrastructure physical completion separately from dashboard status', () => {
    expect(schema).toContain('physicalCompletionVerified');
    expect(schema).toContain('digitalTwinStatus');
    expect(schema).toContain('dashboardStatus');
  });

  it('requires attribution metadata and preserves adverse status', () => {
    expect(schema).toContain('attributionMetadata');
    expect(schema).toContain('adverseStatusPreserved');
    expect(schema).toContain('doesNotClaimNationalCausation');
  });

  it('marks risk scores as not affecting approval by default', () => {
    expect(schema).toContain('doesNotAffectApproval');
    expect(schema).toContain('@default(true)');
  });
});
