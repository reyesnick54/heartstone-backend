import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FORBIDDEN_MASTER_FILE_LIFECYCLE_STATUSES,
  MASTER_FILE_SECTION_DEFINITIONS,
} from './records.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Records schema coherence (Phase 7A)', () => {
  const schema = readSchema();

  it('defines MasterAdministrativeFile and section models', () => {
    expect(schema).toContain('model MasterAdministrativeFile');
    expect(schema).toContain('model MasterAdministrativeFileSection');
  });

  it('defines all twenty controlled section types', () => {
    const block = schema.slice(
      schema.indexOf('enum MasterAdministrativeFileSectionType'),
      schema.indexOf('model MasterAdministrativeFile'),
    );

    for (const section of MASTER_FILE_SECTION_DEFINITIONS) {
      expect(block).toContain(section.sectionType);
    }
    expect(MASTER_FILE_SECTION_DEFINITIONS).toHaveLength(20);
  });

  it('uses institutional file lifecycle statuses without approval semantics', () => {
    const block = schema.slice(
      schema.indexOf('enum MasterAdministrativeFileLifecycleStatus'),
      schema.indexOf('enum MasterAdministrativeFileSecurityClassification'),
    );

    for (const forbidden of FORBIDDEN_MASTER_FILE_LIFECYCLE_STATUSES) {
      expect(block).not.toContain(forbidden);
    }
    expect(block).toContain('OPEN');
    expect(block).toContain('ARCHIVED');
  });

  it('keeps one master file per case and immutable file number', () => {
    const block = schema.slice(
      schema.indexOf('model MasterAdministrativeFile'),
      schema.indexOf('model MasterAdministrativeFileSection'),
    );
    expect(block).toMatch(/fileNumber\s+String\s+@unique/);
    expect(block).toMatch(/caseId\s+String\s+@unique\s+@db\.Uuid/);
    expect(block).toContain('administrativeOwnerOfficeId');
    expect(block).toContain('recordsCustodianOfficeId');
  });
});
