import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EVIDENCE_RECORDS_MODEL_NAMES } from './evidence-records.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Evidence records schema coherence (Phase 7G)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 7G models exactly once', () => {
    for (const modelName of EVIDENCE_RECORDS_MODEL_NAMES) {
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
    expect(schema).toContain('authorityReference         String');
    expect(schema).toContain('manifestCertificateHash    String');
  });

  it('audits legal hold release separately from hold creation', () => {
    expect(schema).toContain('model LegalHoldReleaseRecord');
    expect(schema).toContain('auditManifestHash          String');
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
