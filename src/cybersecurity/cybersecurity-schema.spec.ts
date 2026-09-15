import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  POST_QUANTUM_MIGRATION_STATUSES,
  SECURITY_CONTROL_DOMAINS,
  SECURITY_FINDING_SEVERITIES,
  SECURITY_TEST_CATEGORIES,
} from './cybersecurity.constants';
import {
  PHASE_13B_ENUM_NAMES,
  PHASE_13B_MODEL_NAMES,
  PHASE_13B_SUPPORTING_MODEL_NAMES,
} from './cybersecurity-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 13B cybersecurity schema guard', () => {
  for (const modelName of [...PHASE_13B_MODEL_NAMES, ...PHASE_13B_SUPPORTING_MODEL_NAMES]) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13B_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const domain of SECURITY_CONTROL_DOMAINS) {
    it(`supports security control domain ${domain}`, () => {
      expect(schema).toContain(domain);
    });
  }

  for (const severity of SECURITY_FINDING_SEVERITIES) {
    it(`supports security finding severity ${severity}`, () => {
      expect(schema).toContain(severity);
    });
  }

  for (const status of POST_QUANTUM_MIGRATION_STATUSES) {
    it(`supports post-quantum migration status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const category of SECURITY_TEST_CATEGORIES) {
    it(`supports security test category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  it('stores secret manager references instead of raw secrets for key references', () => {
    const block = /model CryptographicKeyReference \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('secretManagerReference');
    expect(block).not.toContain('secretValue');
  });

  it('defaults permanent security exceptions to false', () => {
    const block = /model SecurityException \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('isPermanent');
    expect(block).toContain('@default(false)');
  });

  it('requires security exception expiration and review date', () => {
    const block = /model SecurityException \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('expiresAt');
    expect(block).toContain('reviewDate');
  });

  it('tracks build provenance traceability fields', () => {
    const block = /model BuildProvenanceRecord \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('sourceCommitSha');
    expect(block).toContain('buildId');
    expect(block).toContain('artifactDigest');
    expect(block).toContain('testRunReference');
  });

  it('separates security accreditation from operational activation', () => {
    const block = /model SecurityAssuranceReview \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('accreditationGranted');
    expect(block).toContain('operationalActivationApproved');
  });

  it('prevents break-glass from creating institutional authority by default', () => {
    const block = /model BreakGlassAccessEvent \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('createsInstitutionalAuthority');
    expect(block).toContain('@default(false)');
  });

  it('preserves historical verification on cryptographic assets by default', () => {
    const block = /model CryptographicAsset \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('historicalVerificationPreserved');
    expect(block).toContain('algorithmVersion');
    expect(block).toContain('postQuantumValidated');
    expect(block).toContain('@default(false)');
  });
});
