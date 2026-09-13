import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PACKET_DECISION_FIELDS } from './evidence.constants';
import {
  EVIDENCE_PACKET_MODEL_NAMES,
  EVIDENCE_PACKET_PURPOSES,
  EVIDENCE_PACKET_VERSION_STATUSES,
  FORBIDDEN_PACKET_VERSION_DECISION_FIELDS,
} from './evidence-schema.constants';

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

describe('Evidence packet schema coherence (Phase 7E)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 7E packet models exactly once', () => {
    for (const modelName of EVIDENCE_PACKET_MODEL_NAMES) {
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

  it('models EvidencePacketVersion without decision outcome fields', () => {
    const block = extractModelBlock(schema, 'EvidencePacketVersion');
    expect(block).toContain('readyForDecisionReview');
    expect(block).toContain('manifestHash');
    for (const field of FORBIDDEN_PACKET_VERSION_DECISION_FIELDS) {
      expect(block).not.toContain(field);
    }
    for (const field of FORBIDDEN_PACKET_DECISION_FIELDS) {
      expect(block).not.toContain(field);
    }
  });

  it('pins exact evidence and document versions on packet items', () => {
    const block = extractModelBlock(schema, 'EvidencePacketItem');
    expect(block).toContain('evidenceRecordId');
    expect(block).toContain('evidenceStatusAtInclusion');
    expect(block).toContain('documentVersionId');
    expect(block).toContain('isExplicitlyExcluded');
  });

  it('stores deterministic manifest with server-side hash', () => {
    const block = extractModelBlock(schema, 'EvidencePacketManifest');
    expect(block).toContain('canonicalManifest');
    expect(block).toContain('manifestHash');
  });

  it('supports PROJECT_READINESS without inventing a Project model', () => {
    expect(schema).not.toContain('model Project');
    expect(extractModelBlock(schema, 'EvidencePacket')).toContain('externalProjectReference');
  });

  it('links evidence packets to Case without embedding decision outcome fields', () => {
    const caseBlock = extractModelBlock(schema, 'Case');
    expect(caseBlock).toContain('evidencePackets');
    expect(caseBlock).not.toContain('decisionOutcome');
  });
});
