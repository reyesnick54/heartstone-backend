import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CASE_ASSIGNMENT_TYPES,
  CASE_ESCALATION_ROUTES,
  CASE_REFERRAL_TYPES,
  CASE_SLA_CLOCK_TYPES,
  FORBIDDEN_PHASE_7_BOUNDARY_MODELS,
  PHASE_6F_FOUNDATION_MODEL_NAMES,
  PHASE_6F_MODEL_NAMES,
} from './applications-workflow-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Applications workflow schema coherence (Phase 6F)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6F foundation models', () => {
    for (const modelName of PHASE_6F_FOUNDATION_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all canonical Phase 6F coordination models', () => {
    for (const modelName of PHASE_6F_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all case assignment types', () => {
    const block = extractEnumBlock(schema, 'CaseAssignmentType');
    for (const assignmentType of CASE_ASSIGNMENT_TYPES) {
      expect(block).toContain(assignmentType);
    }
  });

  it('defines all referral types', () => {
    const block = extractEnumBlock(schema, 'CaseReferralType');
    for (const referralType of CASE_REFERRAL_TYPES) {
      expect(block).toContain(referralType);
    }
  });

  it('defines distinct SLA clock semantics', () => {
    const block = extractEnumBlock(schema, 'CaseSlaClockType');
    for (const clockType of CASE_SLA_CLOCK_TYPES) {
      expect(block).toContain(clockType);
    }
  });

  it('defines escalation routes without authority bypass fields', () => {
    const block = extractEnumBlock(schema, 'CaseEscalationRoute');
    for (const route of CASE_ESCALATION_ROUTES) {
      expect(block).toContain(route);
    }

    const escalationModel = extractModelBlock(schema, 'CaseEscalation');
    expect(escalationModel).toContain('preservesAuthorityBoundary');
    expect(escalationModel).not.toContain('grantsAuthority');
  });

  it('keeps CaseAssignment distinct from Appointment and Delegation', () => {
    const block = extractModelBlock(schema, 'CaseAssignment');
    expect(block).not.toContain('Delegation');
    expect(block).not.toContain('Appointment');
  });

  it('does not define Phase 7 boundary models', () => {
    for (const modelName of FORBIDDEN_PHASE_7_BOUNDARY_MODELS) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
