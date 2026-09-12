import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATIONS_MODEL_NAMES,
  CASE_WORKFLOW_STAGES,
  COMPLETENESS_REVIEW_ITEM_STATUSES,
  COMPLETENESS_REVIEW_STATUSES,
  FORBIDDEN_COMPLETENESS_ITEM_STATUSES,
  CASE_WORKFLOW_INSTANCE_STATUSES,
  CASE_WORKFLOW_STEP_INSTANCE_STATUSES,
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

describe('Applications schema coherence (Phase 6E)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6 application-processing models', () => {
describe('Applications workflow schema coherence (Phase 6D)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6D workflow runtime models', () => {
    for (const modelName of APPLICATIONS_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines completeness review statuses without VERIFIED', () => {
    const block = extractEnumBlock(schema, 'CompletenessReviewStatus');
    for (const status of COMPLETENESS_REVIEW_STATUSES) {
      expect(block).toContain(status);
    }
    expect(block).not.toContain('VERIFIED');
  });

  it('defines completeness item statuses without VERIFIED', () => {
    const block = extractEnumBlock(schema, 'CompletenessReviewItemStatus');
    for (const status of COMPLETENESS_REVIEW_ITEM_STATUSES) {
      expect(block).toContain(status);
    }
    for (const forbidden of FORBIDDEN_COMPLETENESS_ITEM_STATUSES) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('defines case workflow stages for the completeness loop', () => {
    const block = extractEnumBlock(schema, 'CaseWorkflowStage');
    for (const stage of CASE_WORKFLOW_STAGES) {
      expect(block).toContain(stage);
    }
  });

  it('pins checklist configuration on application submissions', () => {
    expect(schema).toContain('pinnedChecklistItemIds');
    expect(schema).toContain('pinnedChecklistFingerprint');
    expect(schema).toContain('checklistConfigurationFingerprint');
  });

  it('marks deficiency notices as procedural and not refusal', () => {
    expect(schema).toContain('isProceduralNotice');
    expect(schema).not.toMatch(/isRefusal/);
  });

  it('links applicant corrections without overwriting prior submissions', () => {
    expect(schema).toContain('priorSubmissionId');
    expect(schema).toContain('triggeredByDeficiencyNoticeId');
    expect(schema).toContain('responseSubmissionId');
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

  it('stores authority evaluation reference on step instances and transition events', () => {
    expect(schema).toMatch(/authorityEvaluationRecordId/);
  });

  it('does not define models reserved for later Phase 6 slices', () => {
    const laterModels = [
      'Application',
      'EvidencePacket',
      'GovernmentDecision',
      'IssuedLicense',
      'IssuedPermit',
      'PaymentTransaction',
      'InspectionCase',
    ];

    for (const modelName of laterModels) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
