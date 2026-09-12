import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7_MODELS } from './evidence-records.constants';
import {
  EVIDENCE_PACKET_STATUS_VALUES,
  EVIDENCE_RECORDS_MODEL_NAMES,
  EVIDENCE_STATUSES,
  EVIDENCE_VERIFICATION_STATUSES,
  FORBIDDEN_EVIDENCE_BOUNDARY_FIELDS,
} from './evidence-records-schema.constants';

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

describe('Evidence records schema coherence (Phase 7)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 7 models exactly once', () => {
    for (const modelName of EVIDENCE_RECORDS_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines evidence status lifecycle values', () => {
    const block = extractEnumBlock(schema, 'EvidenceStatus');
    for (const status of EVIDENCE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines verification status values', () => {
    const block = extractEnumBlock(schema, 'EvidenceVerificationStatus');
    for (const status of EVIDENCE_VERIFICATION_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines packet status values including sealed state', () => {
    const block = extractEnumBlock(schema, 'EvidencePacketStatus');
    for (const status of EVIDENCE_PACKET_STATUS_VALUES) {
      expect(block).toContain(status);
    }
  });

  it('requires institutional owner on MasterAdministrativeFile', () => {
    const block = extractModelBlock(schema, 'MasterAdministrativeFile');
    expect(block).toContain('institutionId');
    expect(block).toContain('caseId');
  });

  it('links master file to Case via stable reference fields', () => {
    const block = extractModelBlock(schema, 'Case');
    expect(block).toContain('masterAdministrativeFileReference');
    for (const field of FORBIDDEN_EVIDENCE_BOUNDARY_FIELDS) {
      expect(block).not.toContain(field);
    }
  });

  it('does not define forbidden Phase 7 boundary models', () => {
    for (const modelName of FORBIDDEN_PHASE_7_MODELS) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });

  it('stores document versions with checksum metadata only', () => {
    const block = extractModelBlock(schema, 'DocumentVersion');
    expect(block).toContain('contentHash');
    expect(block).toContain('storageReference');
    expect(block).not.toContain('isAuthentic');
    expect(block).not.toContain('verified');
  });
});
