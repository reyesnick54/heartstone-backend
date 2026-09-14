import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_PHASE_7C_MODELS, PHASE_7G_MODEL_NAMES } from './evidence-records.constants';
import {
  EVIDENCE_RECORDS_ENUM_NAMES,
  EVIDENCE_RECORDS_MODEL_NAMES,
  MALWARE_SCAN_STATUSES,
  SECURITY_CLASSIFICATIONS,
} from './evidence-records-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function extractModelBlock(source: string, modelName: string): string {
  const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'm').exec(source);
  return match?.[0] ?? '';
}

describe('Evidence records schema (Phase 7B)', () => {
  for (const modelName of EVIDENCE_RECORDS_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of EVIDENCE_RECORDS_ENUM_NAMES) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('does not implement Phase 7C models yet', () => {
    for (const model of FORBIDDEN_PHASE_7C_MODELS) {
      expect(schema).not.toContain(`model ${model}`);
    }
  });

  it('stores content outside PostgreSQL', () => {
    const versionBlock = extractModelBlock(schema, 'DocumentVersion');
    expect(versionBlock).toContain('storageObjectKey');
    expect(versionBlock).not.toMatch(/content\s+Bytes/);
    expect(versionBlock).not.toMatch(/binary\s+/);
  });

  it('defaults authenticity to NOT_EVALUATED', () => {
    const versionBlock = extractModelBlock(schema, 'DocumentVersion');
    expect(versionBlock).toContain('authenticityStatus');
    expect(versionBlock).toContain('NOT_EVALUATED');
  });

  it('supports required malware scan statuses', () => {
    for (const status of MALWARE_SCAN_STATUSES) {
      expect(schema).toContain(status);
    }
  });

  it('supports required security classifications', () => {
    for (const classification of SECURITY_CLASSIFICATIONS) {
      expect(schema).toContain(classification);
    }
  });

  it('prepares Phase 7 stable references on Case', () => {
    const caseBlock = extractModelBlock(schema, 'Case');
    expect(caseBlock).toContain('documentRegisterReference');
    expect(caseBlock).toContain('masterAdministrativeFileReference');
  });
});

describe('Evidence records schema coherence (Phase 7G)', () => {
  it('defines all canonical Phase 7G models exactly once', () => {
    for (const modelName of PHASE_7G_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines controlled retention trigger types without executable code hooks', () => {
    const block = schema.slice(
      schema.indexOf('enum RetentionTriggerType'),
      schema.indexOf('enum RetentionDurationUnit'),
    );
    expect(block).toContain('DATE_CREATED');
    expect(block).toContain('CUSTOM_APPROVED_TRIGGER');
    expect(block).not.toContain('EXECUTABLE');
    expect(block).not.toContain('SCRIPT');
  });

  it('stores institutional retention authority via governingSourceId on schedules', () => {
    expect(schema).toContain('governingSourceId');
    expect(schema).toContain('scheduleSnapshotHash');
  });

  it('requires explicit disposition authorization records', () => {
    expect(schema).toContain('model RecordDispositionRecord');
    const block = extractModelBlock(schema, 'RecordDispositionRecord');
    expect(block).toContain('authorityReference');
    expect(block).toContain('manifestCertificateHash');
  });

  it('audits legal hold release separately from hold creation', () => {
    expect(schema).toContain('model LegalHoldReleaseRecord');
    const block = extractModelBlock(schema, 'LegalHoldReleaseRecord');
    expect(block).toContain('auditManifestHash');
  });

  it('does not define automatic destruction fields on retention schedules', () => {
    const scheduleBlock = schema.slice(
      schema.indexOf('model RetentionSchedule'),
      schema.indexOf('model RetentionRule'),
    );
    expect(scheduleBlock).not.toContain('autoDelete');
    expect(scheduleBlock).not.toContain('destroyOnExpiry');
  });
});
