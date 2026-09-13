import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMPLIANCE_MATTER_STATUSES,
  CONTINUING_OBLIGATION_STATUSES,
  INSPECTION_PLAN_TRIGGER_TYPES,
  PHASE_9A_ENUM_NAMES,
  PHASE_9A_MODEL_NAMES,
  PHASE_9C_MODEL_NAMES,
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

describe('Phase 9C inspection planning schema', () => {
  for (const modelName of PHASE_9C_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const triggerType of INSPECTION_PLAN_TRIGGER_TYPES) {
    it(`supports inspection plan trigger ${triggerType}`, () => {
      expect(schema).toContain(triggerType);
    });
  }

  it('does not attach authority evaluation to inspection assignment', () => {
    const block =
      /model InspectionAssignment \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).not.toContain('authorityEvaluationRecordId');
  });

  it('preserves risk factors and optional risk score on inspection plans', () => {
    const block = /model InspectionPlan \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('riskFactors');
    expect(block).toContain('riskScore');
    expect(block).toContain('triggerReference');
    expect(block).toContain('authorizedConditionId');
  });

  it('requires explicit unannounced configuration on inspection type definitions', () => {
    const block =
      /model InspectionTypeDefinition \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('unannouncedAllowed');
    expect(block).toContain('noticeRequirement');
  });
});
