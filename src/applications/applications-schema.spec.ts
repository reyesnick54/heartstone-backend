import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATIONS_MODEL_NAMES,
  CASE_WORKFLOW_INSTANCE_STATUSES,
  CASE_WORKFLOW_STEP_INSTANCE_STATUSES,
  COMPLETENESS_REVIEW_ITEM_STATUSES,
  FORBIDDEN_COMPLETENESS_ITEM_STATUSES,
  WORKFLOW_STEP_TYPES,
} from './applications-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Applications workflow schema coherence (Phase 6D)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6D workflow runtime models', () => {
    for (const modelName of APPLICATIONS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all case workflow instance statuses', () => {
    const block = extractEnumBlock(schema, 'CaseWorkflowInstanceStatus');
    for (const status of CASE_WORKFLOW_INSTANCE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines all case workflow step instance statuses', () => {
    const block = extractEnumBlock(schema, 'CaseWorkflowStepInstanceStatus');
    for (const status of CASE_WORKFLOW_STEP_INSTANCE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines workflow step types including decision and issuance gates', () => {
    const block = extractEnumBlock(schema, 'WorkflowStepType');
    for (const stepType of WORKFLOW_STEP_TYPES) {
      expect(block).toContain(stepType);
    }
  });

  it('pins workflow version on case workflow instance', () => {
    expect(schema).toMatch(/workflowVersionId/);
    expect(schema).toContain('CaseWorkflowInstance');
  });

  it('does not define models reserved for later phases', () => {
    const laterModels = [
      'GovernmentDecision',
      'IssuedLicense',
      'IssuedPermit',
      'EvidenceVault',
      'MasterAdministrativeFile',
    ];

    for (const modelName of laterModels) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
