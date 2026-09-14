import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMPLIANCE_ESCALATION_TYPES,
  NONCOMPLIANCE_FINDING_STATUSES,
  PHASE_9F_ENUM_NAMES,
  PHASE_9F_MODEL_NAMES,
  PROTECTIVE_ACTION_RECOMMENDATION_TYPES,
  CORRECTIVE_ACTION_PLAN_STATUSES,
  CORRECTIVE_ACTION_VERIFICATION_RESULTS,
  PHASE_9E_ENUM_NAMES,
  PHASE_9E_MODEL_NAMES,
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
describe('Inspection compliance schema coherence (Phase 9E)', () => {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  it('defines all canonical Phase 9E models exactly once', () => {
    for (const modelName of PHASE_9E_MODEL_NAMES) {
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
  INSPECTION_FINDING_SEVERITIES,
  INSPECTION_FINDING_STATUSES,
  INSPECTION_RESPONSE_TYPES,
  PHASE_9D_MODEL_NAMES,
} from './inspection-compliance-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Inspection compliance schema coherence (Phase 9D)', () => {
  for (const modelName of PHASE_9D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('extends InspectionRecord rather than replacing it', () => {
    expect(schema).toContain('model InspectionRecord');
    const recordBlock = extractModelBlock(schema, 'InspectionRecord');
    expect(recordBlock).toContain('session                   InspectionSession?');
  });

  it('links InspectionSession to canonical InspectionRecord', () => {
    const sessionBlock = extractModelBlock(schema, 'InspectionSession');
    expect(sessionBlock).toContain('inspectionRecordId');
    expect(sessionBlock).toContain('inspectionRecord                   InspectionRecord');
  });

  it('supports configurable finding severities without sanction fields', () => {
    for (const severity of INSPECTION_FINDING_SEVERITIES) {
      expect(schema).toContain(severity);
    }
    const findingBlock = extractModelBlock(schema, 'InspectionFinding');
    expect(findingBlock).not.toContain('sanction');
    expect(findingBlock).not.toContain('violationConfirmed');
  });

  it('supports finding statuses including disputed and superseded', () => {
    for (const status of INSPECTION_FINDING_STATUSES) {
      expect(schema).toContain(status);
    }
  });

  it('requires findings to link requirements through FindingRequirementLink', () => {
    const linkBlock = extractModelBlock(schema, 'FindingRequirementLink');
    expect(linkBlock).toContain('governingSourceId');
    expect(linkBlock).toContain('requirementReference');
  });

  it('preserves subject responses separately from findings and observations', () => {
    const responseBlock = extractModelBlock(schema, 'InspectionResponse');
    expect(responseBlock).toContain('inspectionFindingId');
    expect(responseBlock).toContain('inspectionObservationId');
    expect(responseBlock).not.toContain('overwrites');
  });

  it('records completion without automatic compliance certification', () => {
    const completionBlock = extractModelBlock(schema, 'InspectionCompletionRecord');
    expect(completionBlock).toContain('constitutesComplianceCertification');
    expect(completionBlock).toContain('@default(false)');
  });

  it('supports all inspection response types', () => {
    for (const responseType of INSPECTION_RESPONSE_TYPES) {
      expect(schema).toContain(responseType);
    }
  });
});
