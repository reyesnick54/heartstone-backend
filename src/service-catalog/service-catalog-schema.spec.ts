import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICANT_CATEGORIES,
  FORBIDDEN_FORM_BOUNDARY_FIELDS,
  FORBIDDEN_SERVICE_CATALOG_AUTHORITY_FIELDS,
  FORM_CONDITIONAL_ACTIONS,
  FORM_FIELD_TYPES,
  FORM_VERSION_STATUSES,
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

  it('does not define Phase 7 decision or issuance models', () => {
  it('does not define Phase 7+ decision or issuance models', () => {
    const phase7Models = [
      'GovernmentDecision',
      'IssuedLicense',
      'IssuedPermit',
      'EvidencePacket',
      'IssuedCertificate',
      'EvidencePacket',
      'EvidenceVault',
      'MasterAdministrativeFile',
      'PaymentTransaction',
      'InspectionCase',
    ];

    for (const modelName of phase7Models) {
      expect(schema).not.toContain(`model ${modelName}`);
    }
  });
});

describe('Forms engine schema coherence (Phase 5C)', () => {
  const schema = readSchema();

  it('defines all form engine models', () => {
    for (const modelName of [
      'FormDefinition',
      'FormVersion',
      'FormSection',
      'FormField',
      'FormFieldConditionalRule',
    ]) {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }
  });

  it('defines all required form field types', () => {
    const enumBlock = extractEnumBlock(schema, 'FormFieldType');
    for (const fieldType of FORM_FIELD_TYPES) {
      expect(enumBlock).toContain(fieldType);
    }
  });

  it('defines conditional actions for deterministic behavior', () => {
    const enumBlock = extractEnumBlock(schema, 'FormConditionalAction');
    for (const action of FORM_CONDITIONAL_ACTIONS) {
      expect(enumBlock).toContain(action);
    }
  });

  it('defines form version lifecycle statuses including published immutability states', () => {
    const enumBlock = extractEnumBlock(schema, 'FormVersionStatus');
    for (const status of FORM_VERSION_STATUSES) {
      expect(enumBlock).toContain(status);
    }
  });

  it('links form definitions to government service versions', () => {
    const block = extractModelBlock(schema, 'FormDefinition');
    expect(block).toContain('governmentServiceVersionId');
    expect(block).toContain('GovernmentServiceVersion');
  });

  it('does not add application or case boundary fields to form models', () => {
    for (const modelName of ['FormDefinition', 'FormVersion', 'FormField']) {
      const block = extractModelBlock(schema, modelName);
      for (const forbiddenField of FORBIDDEN_FORM_BOUNDARY_FIELDS) {
        expect(block).not.toContain(forbiddenField);
      }
    }
  });
});
