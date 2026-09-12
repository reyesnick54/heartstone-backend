import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  EVIDENCE_MODEL_NAMES,
  EVIDENCE_PACKET_PURPOSES,
  EVIDENCE_PACKET_VERSION_STATUSES,
  FORBIDDEN_PACKET_VERSION_DECISION_FIELDS,
} from './evidence-schema.constants';
import { FORBIDDEN_PACKET_DECISION_FIELDS } from './evidence.constants';

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

describe('Evidence schema coherence (Phase 7E)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 7E evidence models exactly once', () => {
    for (const modelName of EVIDENCE_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all evidence packet purposes', () => {
    const block = extractEnumBlock(schema, 'EvidencePacketPurpose');
    for (const purpose of EVIDENCE_PACKET_PURPOSES) {
      expect(block).toContain(purpose);
    }
  });

  it('defines all packet version statuses including FROZEN and SUPERSEDED', () => {
    const block = extractEnumBlock(schema, 'EvidencePacketVersionStatus');
    for (const status of EVIDENCE_PACKET_VERSION_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('models EvidencePacket with stable identity fields', () => {
    const block = extractModelBlock(schema, 'EvidencePacket');
    expect(block).toContain('packetNumber');
    expect(block).toContain('masterAdministrativeFileId');
    expect(block).toContain('caseId');
    expect(block).toContain('purpose');
    expect(block).toContain('questionOrIssue');
    expect(block).toContain('responsibleDepartmentId');
    expect(block).toContain('externalProjectReference');
  });

  it('models EvidencePacketVersion as immutable snapshot with manifest hash', () => {
    const block = extractModelBlock(schema, 'EvidencePacketVersion');
    expect(block).toContain('version');
    expect(block).toContain('status');
    expect(block).toContain('evidenceCutoffAt');
    expect(block).toContain('assembledByIdentityId');
    expect(block).toContain('assembledByOfficeholderId');
    expect(block).toContain('authorityEvaluationRecordId');
    expect(block).toContain('frozenAt');
    expect(block).toContain('manifestHash');
    expect(block).toContain('supersededById');
    expect(block).toContain('readyForDecisionReview');
    expect(block).not.toContain('approved');
    expect(block).not.toContain('refused');
    expect(block).not.toContain('decisionOutcome');
  });

  it('pins exact evidence and document versions on packet items', () => {
    const block = extractModelBlock(schema, 'EvidencePacketItem');
    expect(block).toContain('evidenceRecordId');
    expect(block).toContain('evidenceStatusAtInclusion');
    expect(block).toContain('documentVersionId');
    expect(block).toContain('isExplicitlyExcluded');
    expect(block).toContain('exclusionRecordId');
  });

  it('stores deterministic manifest with server-side hash', () => {
    const block = extractModelBlock(schema, 'EvidencePacketManifest');
    expect(block).toContain('canonicalManifest');
    expect(block).toContain('manifestHash');
  });

  it('requires controlled exclusion records with authorization', () => {
    const block = extractModelBlock(schema, 'EvidencePacketItemExclusion');
    expect(block).toContain('exclusionReason');
    expect(block).toContain('authorizedByIdentityId');
    expect(block).toContain('authorizedByOfficeholderId');
    expect(block).toContain('authorityEvaluationRecordId');
  });

  it('does not expose decision outcome fields on packet versions', () => {
    for (const field of FORBIDDEN_PACKET_VERSION_DECISION_FIELDS) {
      expect(extractModelBlock(schema, 'EvidencePacketVersion')).not.toContain(field);
    }
    for (const field of FORBIDDEN_PACKET_DECISION_FIELDS) {
      expect(schema).not.toMatch(new RegExp(`model EvidencePacket[\\s\\S]*${field}`));
    }
  });

  it('supports PROJECT_READINESS without inventing a Project model', () => {
    expect(schema).not.toContain('model Project');
    expect(extractModelBlock(schema, 'EvidencePacket')).toContain('externalProjectReference');
  });
});
