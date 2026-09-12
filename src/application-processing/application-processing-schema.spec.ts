import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATION_PROCESSING_MODEL_NAMES,
  CASE_COMMUNICATION_TYPES,
  CASE_EVENT_TYPES,
  CASE_MILESTONE_STATUSES,
  CASE_PUBLIC_STATUS_STAGES,
  FORBIDDEN_CLIENT_SETTABLE_CASE_FIELDS,
  PHASE_7_REFERENCE_FIELDS,
} from './application-processing-schema.constants';

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

describe('Application processing schema coherence (Phase 6G)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6G models', () => {
    for (const modelName of APPLICATION_PROCESSING_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all required case event types', () => {
    const block = extractEnumBlock(schema, 'CaseEventType');
    for (const eventType of CASE_EVENT_TYPES) {
      expect(block).toContain(eventType);
    }
    expect(block).not.toMatch(/^\s*DECISION\s*$/m);
    expect(block).not.toMatch(/^\s*ISSUED\s*$/m);
    expect(block).not.toContain('DECISION_MADE');
    expect(block).not.toContain('DECISION_ISSUED');
  });

  it('defines all communication types including internal notes', () => {
    const block = extractEnumBlock(schema, 'CaseCommunicationType');
    for (const type of CASE_COMMUNICATION_TYPES) {
      expect(block).toContain(type);
    }
  });

  it('defines milestone statuses without approval semantics', () => {
    const block = extractEnumBlock(schema, 'CaseMilestoneStatus');
    for (const status of CASE_MILESTONE_STATUSES) {
      expect(block).toContain(status);
    }
    expect(block).not.toContain('APPROVED');
    expect(block).not.toContain('REFUSED');
  });

  it('defines applicant-facing public status stages', () => {
    const block = extractEnumBlock(schema, 'CasePublicStatusStage');
    for (const stage of CASE_PUBLIC_STATUS_STAGES) {
      expect(block).toContain(stage);
    }
  });

  it('keeps CaseEvent append-only without update fields', () => {
    const caseEventSection = schema.slice(
      schema.indexOf('model CaseEvent'),
      schema.indexOf('model CaseCommunication'),
    );
    expect(caseEventSection).toContain('publicVisibility');
    expect(caseEventSection).toContain('occurredAt');
    expect(caseEventSection).not.toContain('updatedAt');
  });

  it('defines Phase 7A Master Administrative File models on Case', () => {
    const block = extractModelBlock(schema, 'Case');
    for (const field of PHASE_7_REFERENCE_FIELDS) {
      expect(block).toContain(field);
    }
    expect(schema).toContain('model MasterAdministrativeFile');
    expect(schema).toContain('model MasterAdministrativeFileSection');
    expect(schema).not.toContain('model DocumentRegister');
    expect(schema).not.toContain('model EvidencePacket');
  });

  it('documents forbidden client-settable projection fields', () => {
    expect(FORBIDDEN_CLIENT_SETTABLE_CASE_FIELDS).toContain('publicStage');
    expect(FORBIDDEN_CLIENT_SETTABLE_CASE_FIELDS).toContain('caseStatus');
  });
});
