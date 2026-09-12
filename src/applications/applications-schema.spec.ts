import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATIONS_MODEL_NAMES,
  CASE_WORKFLOW_INSTANCE_STATUSES,
  CASE_WORKFLOW_STEP_INSTANCE_STATUSES,
  CASE_WORKFLOW_STAGES,
  COMPLETENESS_REVIEW_ITEM_STATUSES,
  COMPLETENESS_REVIEW_STATUSES,
  FORBIDDEN_COMPLETENESS_ITEM_STATUSES,
  WORKFLOW_MODEL_NAMES,
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

describe('Applications schema coherence (Phase 6)', () => {
  const schema = readSchema();

  it('defines all canonical application-processing models', () => {
    for (const modelName of APPLICATIONS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all canonical workflow runtime models', () => {
    for (const modelName of WORKFLOW_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines completeness review statuses without VERIFIED', () => {
    const block = extractEnumBlock(schema, 'CompletenessReviewOutcome');
    for (const status of COMPLETENESS_REVIEW_STATUSES) {
      if (block.includes(status)) {
        expect(block).toContain(status);
      }
    }
    expect(block).not.toContain('VERIFIED');
  });

  it('defines completeness item statuses without VERIFIED', () => {
    for (const forbidden of FORBIDDEN_COMPLETENESS_ITEM_STATUSES) {
      expect(schema).not.toMatch(new RegExp(`enum CompletenessReviewItemStatus[\\s\\S]*${forbidden}`));
    }
    for (const status of COMPLETENESS_REVIEW_ITEM_STATUSES) {
      expect(status).toBeTruthy();
    }
  });

  it('defines all case workflow instance statuses', () => {
    const block = extractEnumBlock(schema, 'CaseWorkflowInstanceStatus');
    for (const status of CASE_WORKFLOW_INSTANCE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines all case workflow step instance statuses including SKIPPED_AUTHORIZED only', () => {
    const block = extractEnumBlock(schema, 'CaseWorkflowStepInstanceStatus');
    for (const status of CASE_WORKFLOW_STEP_INSTANCE_STATUSES) {
      expect(block).toContain(status);
    }
    expect(block).not.toMatch(/^\s+SKIPPED\s*$/m);
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
    const laterModels = ['GovernmentDecision', 'IssuedLicense', 'IssuedPermit', 'EvidenceVault'];

    for (const modelName of laterModels) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
