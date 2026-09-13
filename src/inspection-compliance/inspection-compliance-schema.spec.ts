import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMPLIANCE_ESCALATION_TYPES,
  NONCOMPLIANCE_FINDING_STATUSES,
  PHASE_9F_ENUM_NAMES,
  PHASE_9F_MODEL_NAMES,
  PROTECTIVE_ACTION_RECOMMENDATION_TYPES,
} from './inspection-compliance-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Inspection compliance schema coherence (Phase 9F)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 9F models exactly once', () => {
    for (const modelName of PHASE_9F_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all canonical Phase 9F enums exactly once', () => {
    for (const enumName of PHASE_9F_ENUM_NAMES) {
      const matches = schema.match(new RegExp(`enum ${enumName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines escalation types including Phase 8 review routes', () => {
    const block = extractEnumBlock(schema, 'ComplianceEscalationType');
    for (const type of COMPLIANCE_ESCALATION_TYPES) {
      expect(block).toContain(type);
    }
  });

  it('defines protective action recommendation types without direct sanction types', () => {
    const block = extractEnumBlock(schema, 'ProtectiveActionRecommendationType');
    for (const type of PROTECTIVE_ACTION_RECOMMENDATION_TYPES) {
      expect(block).toContain(type);
    }
    expect(block).not.toContain('SUSPEND');
    expect(block).not.toContain('REVOKE');
  });

  it('tracks noncompliance finding status separately from confirmed violation', () => {
    const block = extractEnumBlock(schema, 'NoncomplianceFindingStatus');
    for (const status of NONCOMPLIANCE_FINDING_STATUSES) {
      expect(block).toContain(status);
    }
    const findingBlock = schema.slice(
      schema.indexOf('model NoncomplianceFinding'),
      schema.indexOf('model ComplianceEscalation'),
    );
    expect(findingBlock).toContain('isAiProposed');
    expect(findingBlock).toContain('confirmedByIdentityId');
  });

  it('links enforcement referrals to retained national authority class', () => {
    const referralBlock = schema.slice(
      schema.indexOf('model EnforcementReferral'),
      schema.indexOf('model ProtectiveActionRecommendation'),
    );
    expect(referralBlock).toContain('retainsNationalAuthority');
    expect(referralBlock).toContain('retainedAuthorityClass');
    expect(referralBlock).not.toContain('prosecutionStatus');
  });

  it('requires post-action review deadline on emergency interim actions', () => {
    const emergencyBlock = schema.slice(
      schema.indexOf('model EmergencyInterimActionRecord'),
      schema.indexOf('// ───') > schema.indexOf('model EmergencyInterimActionRecord')
        ? schema.indexOf('// ───', schema.indexOf('model EmergencyInterimActionRecord') + 1)
        : schema.length,
    );
    expect(emergencyBlock).toContain('effectiveUntil');
    expect(emergencyBlock).toContain('postActionReviewDeadline');
    expect(emergencyBlock).toContain('postActionReviewCompletedAt');
  });
});
