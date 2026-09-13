import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CORRECTIVE_ACTION_PLAN_STATUSES,
  CORRECTIVE_ACTION_VERIFICATION_RESULTS,
  PHASE_9E_ENUM_NAMES,
  PHASE_9E_MODEL_NAMES,
} from './inspection-compliance-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

describe('Inspection compliance schema coherence (Phase 9E)', () => {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  it('defines all canonical Phase 9E models exactly once', () => {
    for (const modelName of PHASE_9E_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all Phase 9E enums', () => {
    for (const enumName of PHASE_9E_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });

  it('defines all corrective action plan statuses', () => {
    const block = /enum CorrectiveActionPlanStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    for (const status of CORRECTIVE_ACTION_PLAN_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines verification results including reinspection required', () => {
    const block = /enum CorrectiveActionVerificationResult\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    for (const result of CORRECTIVE_ACTION_VERIFICATION_RESULTS) {
      expect(block).toContain(result);
    }
  });

  it('links corrective action submissions to Phase 7 evidence records', () => {
    expect(schema).toContain('model CorrectiveActionSubmissionEvidence');
    expect(schema).toContain('evidenceRecord             EvidenceRecord');
  });

  it('preserves historical closure on reopening', () => {
    const reopeningBlock = /model ComplianceFindingReopening\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(reopeningBlock).toContain('priorClosureId');
    expect(reopeningBlock).toContain('ComplianceFindingClosure');
  });
});
