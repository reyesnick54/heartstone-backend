import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DECISIONS_ISSUANCE_MODEL_NAMES,
  EVIDENCE_PACKET_VERSION_STATUSES,
  INSTRUMENT_DELIVERY_AUDIT_EVENT_TYPES,
  INSTRUMENT_DELIVERY_CHANNELS,
  INSTRUMENT_VERIFICATION_STATUSES,
  OFFICIAL_INSTRUMENT_KINDS,
  PHASE_8F_MODEL_NAMES,
} from './decisions-issuance-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Decisions issuance schema coherence (Phase 8E+8F)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 8E and 8F models exactly once', () => {
    for (const modelName of DECISIONS_ISSUANCE_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all Phase 8F delivery, receipt, and verification models exactly once', () => {
    for (const modelName of PHASE_8F_MODEL_NAMES) {
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

  it('defines all supported delivery channels', () => {
    const block = extractEnumBlock(schema, 'InstrumentDeliveryChannel');
    for (const channel of INSTRUMENT_DELIVERY_CHANNELS) {
      expect(block).toContain(channel);
    }
  });

  it('defines all verification statuses including restricted public responses', () => {
    const block = extractEnumBlock(schema, 'InstrumentVerificationStatus');
    for (const status of INSTRUMENT_VERIFICATION_STATUSES) {
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
    expect(schema).toContain('instrumentNumber             String?');
    const statusEnum = extractEnumBlock(schema, 'OfficialInstrumentStatus');
    expect(statusEnum).toContain('PENDING_ISSUANCE');
  });

  it('defines delivery audit event types for delivery, download, verification, and receipt', () => {
    const block = extractEnumBlock(schema, 'InstrumentDeliveryAuditEventType');
    for (const eventType of INSTRUMENT_DELIVERY_AUDIT_EVENT_TYPES) {
      expect(block).toContain(eventType);
    }
  });

  it('stores high-entropy verification codes separately from sequential instrument numbers', () => {
    expect(schema).toContain('verificationCode     String                        @unique');
    expect(schema).toContain('instrumentNumber             String?                       @unique');
  });

  it('models delivery attempts separately from parent delivery for retry support', () => {
    expect(schema).toContain('model InstrumentDeliveryAttempt');
    expect(schema).toContain('attemptNumber             Int');
  });
});
