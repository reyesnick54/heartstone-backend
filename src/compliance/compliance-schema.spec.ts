import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMPLIANCE_MATTER_STATUSES,
  COMPLIANCE_REVIEW_STATUSES,
  COMPLIANCE_SUBMISSION_STATUSES,
  CONTINUING_OBLIGATION_STATUSES,
  FORBIDDEN_COMPLIANCE_REVIEW_STATUSES,
  PHASE_9A_ENUM_NAMES,
  PHASE_9A_MODEL_NAMES,
  PHASE_9B_ENUM_NAMES,
  PHASE_9B_MODEL_NAMES,
} from './compliance-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 9A compliance schema', () => {
  for (const modelName of PHASE_9A_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_9A_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('does not use COMPLIANT or NONCOMPLIANT at compliance matter level', () => {
    const block = /enum ComplianceMatterStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).not.toContain('COMPLIANT');
    expect(block).not.toContain('NONCOMPLIANT');
  });

  for (const status of COMPLIANCE_MATTER_STATUSES) {
    it(`supports compliance matter status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const status of CONTINUING_OBLIGATION_STATUSES) {
    it(`supports continuing obligation status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  it('links obligations to decision conditions without duplicating the model', () => {
    expect(schema.match(/model DecisionCondition \{/g)).toHaveLength(1);
    const obligationBlock = /model ContinuingObligation \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(obligationBlock).toContain('sourceDecisionConditionId');
    expect(obligationBlock).toContain('approvedConditionText');
  });

  it('stores recurrence schedules separately from obligation status history', () => {
    expect(schema).toContain('model ObligationSchedule');
    expect(schema).toContain('model ObligationStatusHistory');
    expect(schema).toContain('lawfulDueDate');
  });
});

describe('Phase 9B compliance schema', () => {
  for (const modelName of PHASE_9B_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_9B_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const status of COMPLIANCE_SUBMISSION_STATUSES) {
    it(`supports compliance submission status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const status of COMPLIANCE_REVIEW_STATUSES) {
    it(`supports compliance review status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  it('does not expose forbidden compliance review statuses', () => {
    const block = /enum ComplianceReviewStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    for (const status of FORBIDDEN_COMPLIANCE_REVIEW_STATUSES) {
      expect(block).not.toContain(status);
    }
  });

  it('links submissions to immutable versions', () => {
    const submissionBlock = /model ComplianceSubmission \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(submissionBlock).toContain('currentVersionId');
    expect(submissionBlock).toContain('versions');
  });
});

