import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FORBIDDEN_IDENTITY_AUTHORITY_FIELDS,
  GOVERNMENT_MODEL_NAMES,
  IDENTITY_MODEL_NAMES,
} from './identity-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = schema.match(pattern);
  return match?.[1] ?? '';
}

describe('Identity schema coherence', () => {
  const schema = readSchema();

  it('defines all canonical identity models', () => {
    for (const modelName of IDENTITY_MODEL_NAMES) {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }
  });

  it('preserves Phase 2 government models without identity-domain duplication', () => {
    for (const modelName of GOVERNMENT_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }

    for (const modelName of IDENTITY_MODEL_NAMES) {
      expect(GOVERNMENT_MODEL_NAMES).not.toContain(modelName);
    }
  });

  it('keeps Organization distinct from Institution', () => {
    expect(schema).toMatch(/model Organization\s*\{/);
    expect(schema).toMatch(/model Institution\s*\{/);
    expect(schema).not.toMatch(/model IdentityInstitution\s*\{/);
  });

  it('keeps UserAccount distinct from Officeholder', () => {
    const userAccountBlock = extractModelBlock(schema, 'UserAccount');
    const officeholderBlock = extractModelBlock(schema, 'Officeholder');

    expect(userAccountBlock).toBeTruthy();
    expect(officeholderBlock).toBeTruthy();
    expect(userAccountBlock).not.toContain('officeholder');
    expect(userAccountBlock).not.toContain('Officeholder');
    expect(officeholderBlock).not.toContain('userAccount');
    expect(officeholderBlock).not.toContain('UserAccount');
  });

  it('does not add authority-evaluation fields to identity primitives', () => {
    const identityPrimitives = [
      'UserAccount',
      'Identity',
      'Credential',
      'OrganizationMembership',
      'AuthenticationMethod',
      'Session',
    ];

    for (const modelName of identityPrimitives) {
      const block = extractModelBlock(schema, modelName);
      for (const forbiddenField of FORBIDDEN_IDENTITY_AUTHORITY_FIELDS) {
        expect(block).not.toContain(forbiddenField);
      }
    }
  });

  it('defines session lifecycle status enum with active, expired, and revoked states', () => {
    const sessionStatusBlock = /enum SessionStatus\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    const sessionStatusMatch = /enum SessionStatus\s*\{([^}]*)\}/s.exec(schema);
    const sessionStatusBlock = sessionStatusMatch?.[1] ?? '';
    expect(sessionStatusBlock).toContain('ACTIVE');
    expect(sessionStatusBlock).toContain('EXPIRED');
    expect(sessionStatusBlock).toContain('REVOKED');
  });

  it('stores credential metadata safely without plaintext secret columns', () => {
    const credentialBlock = extractModelBlock(schema, 'Credential');

    expect(credentialBlock).toContain('secretHash');
    expect(credentialBlock).toContain('oidcProvider');
    expect(credentialBlock).toContain('oidcSubject');
    expect(credentialBlock).toContain('apiKeyHash');
    expect(credentialBlock).not.toMatch(/\bpassword\b/i);
    expect(credentialBlock).not.toMatch(/\baccessToken\b/i);
    expect(credentialBlock).not.toMatch(/\brefreshToken\b/i);
    expect(credentialBlock).not.toMatch(/\bmfaSecret\b/i);
    expect(credentialBlock).not.toMatch(/\bplaintext\b/i);
  });

  it('defines RepresentativeAuthority without coupling to Appointment or Delegation', () => {
    const representativeBlock = extractModelBlock(schema, 'RepresentativeAuthority');

    expect(representativeBlock).toBeTruthy();
    expect(representativeBlock).not.toContain('appointment');
    expect(representativeBlock).not.toContain('Appointment');
    expect(representativeBlock).not.toContain('delegation');
    expect(representativeBlock).not.toContain('Delegation');
  });
});
