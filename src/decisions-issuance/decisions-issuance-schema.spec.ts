import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PHASE_8D_MODEL_NAMES } from './decisions-issuance.constants';

describe('DecisionsIssuance schema boundaries (Phase 8D)', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  for (const modelName of PHASE_8D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName}\\b`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('does not store private key fields on credential reference model', () => {
    const modelBlock = schema.slice(
      schema.indexOf('model ElectronicSignatureCredentialReference'),
      schema.indexOf('model SignableInstrumentBinding'),
    );
    expect(modelBlock).not.toMatch(/privateKey/i);
    expect(modelBlock).not.toMatch(/secretKey/i);
  });

  it('defines signature record as append-only evidence store fields', () => {
    expect(schema).toContain('signatureValueReference');
    expect(schema).not.toMatch(/signatureValue\s+String/);
import {
  EVIDENCE_PACKET_VERSION_STATUSES,
  OFFICIAL_INSTRUMENT_KINDS,
  PHASE_8E_MODEL_NAMES,
} from './decisions-issuance-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Decisions issuance schema coherence (Phase 8E)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 8E models exactly once', () => {
    for (const modelName of PHASE_8E_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('does not reference removed EvidencePacketVersionItem model', () => {
    expect(schema).not.toContain('model EvidencePacketVersionItem');
  });

  it('defines all official instrument kinds', () => {
    const block = /enum OfficialInstrumentKind\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    for (const kind of OFFICIAL_INSTRUMENT_KINDS) {
      expect(block).toContain(kind);
    }
  });

  it('defines frozen evidence packet version statuses used by decisions', () => {
    const block = /enum EvidencePacketVersionStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    for (const status of EVIDENCE_PACKET_VERSION_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('links GovernmentDecision to frozen EvidencePacketVersion', () => {
    const block = /model GovernmentDecision\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('evidencePacketVersionId');
    expect(block).toContain('evidencePacketVersion');
  });

  it('adds ISSUED case status for post-issuance transition only', () => {
    const block = /enum CaseStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('ISSUED');
  });

  it('adds INSTRUMENT_ISSUED case event without bare ISSUED event type', () => {
    const block = /enum CaseEventType\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('INSTRUMENT_ISSUED');
    expect(block).not.toMatch(/^\s*ISSUED\s*$/m);
  });

  it('does not permit client-chosen instrument numbers on OfficialInstrument create fields', () => {
    const block = /model OfficialInstrument\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('instrumentNumber');
    expect(block).toContain('PENDING_ISSUANCE');
  });
});
