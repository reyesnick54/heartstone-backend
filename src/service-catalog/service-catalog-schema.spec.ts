import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SERVICE_CATALOG_MODEL_NAMES } from './service-catalog-schema.constants';

describe('Service Catalog schema coherence', () => {
  const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

  for (const modelName of SERVICE_CATALOG_MODEL_NAMES) {
    it(`defines model ${modelName}`, () => {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    });
  }

  it('does not define APPROVED as an eligibility guidance outcome', () => {
    const outcomeBlock = /enum EligibilityGuidanceOutcome \{[^}]+\}/.exec(schema)?.[0] ?? '';
    expect(outcomeBlock).not.toContain('APPROVED');
import {
  APPLICANT_CATEGORIES,
  FORBIDDEN_SERVICE_CATALOG_AUTHORITY_FIELDS,
  GOVERNMENT_SERVICE_MATURITY_STATUSES,
  GOVERNMENT_SERVICE_PUBLIC_AVAILABILITY_MODES,
  SERVICE_CATALOG_MODEL_NAMES,
} from './service-catalog-schema.constants';

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

describe('Service catalog schema coherence (Phase 5A)', () => {
  const schema = readSchema();

  it('defines all canonical service catalog models', () => {
    for (const modelName of SERVICE_CATALOG_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines all canonical maturity statuses including CONFIGURED and ACTIVE as distinct states', () => {
    const block = extractEnumBlock(schema, 'GovernmentServiceMaturityStatus');
    for (const status of GOVERNMENT_SERVICE_MATURITY_STATUSES) {
      expect(block).toContain(status);
    }
    expect(block).toContain('CONFIGURED');
    expect(block).toContain('ACTIVE');
  });

  it('defines all canonical public availability modes', () => {
    const block = extractEnumBlock(schema, 'GovernmentServicePublicAvailability');
    for (const mode of GOVERNMENT_SERVICE_PUBLIC_AVAILABILITY_MODES) {
      expect(block).toContain(mode);
    }
  });

  it('defines reusable applicant categories as an enum', () => {
    const block = extractEnumBlock(schema, 'ApplicantCategory');
    for (const category of APPLICANT_CATEGORIES) {
      expect(block).toContain(category);
    }
  });

  it('keeps GovernmentService code and slug unique and stable', () => {
    const block = extractModelBlock(schema, 'GovernmentService');
    expect(block).toMatch(/code\s+String\s+@unique/);
    expect(block).toMatch(/slug\s+String\s+@unique/);
  });

  it('links GovernmentServiceVersion to stable GovernmentService identity', () => {
    const block = extractModelBlock(schema, 'GovernmentServiceVersion');
    expect(block).toContain('governmentServiceId');
    expect(block).toContain('governmentService');
    expect(block).toMatch(/@@unique\(\[governmentServiceId, version\]\)/);
  });

  it('references FunctionAuthorityRecord without duplicating authority fields', () => {
    const block = extractModelBlock(schema, 'ServiceFunctionMapping');
    expect(block).toContain('functionAuthorityRecordId');
    expect(block).toContain('functionAuthorityRecord');

    for (const field of FORBIDDEN_SERVICE_CATALOG_AUTHORITY_FIELDS) {
      expect(block).not.toContain(field);
    }
  });

  it('keeps GovernmentService distinct from FunctionAuthorityRecord', () => {
    const serviceBlock = extractModelBlock(schema, 'GovernmentService');
    expect(serviceBlock).not.toContain('FunctionAuthorityRecord');
    expect(serviceBlock).not.toContain('lifecycleStatus');
    expect(serviceBlock).not.toContain('classification');
  });

  it('models ServiceFamily as data-driven records rather than hard-coded enums', () => {
    expect(schema).toContain('model ServiceFamily');
    expect(schema).not.toMatch(/enum ServiceFamilyType/);
  });

  it('does not define Phase 6 application-processing models', () => {
    const phase6Models = [
      'Application',
      'Case',
      'CaseWorkflow',
      'EvidencePacket',
      'GovernmentDecision',
      'IssuedLicense',
      'IssuedPermit',
      'PaymentTransaction',
      'InspectionCase',
    ];

    for (const modelName of phase6Models) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});
