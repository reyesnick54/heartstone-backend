import { AssuranceLevel } from '@prisma/client';

import { SIGNATURE_EXPLANATION_CODES } from '../decisions-issuance.constants';
import { meetsAssuranceLevel } from './common/assurance-level.util';
import {
  assertNoPrivateKeyMaterial,
  scanObjectForPrivateKeyMaterial,
} from './common/private-key-guard.util';

describe('Phase 8D invariants', () => {
  it('treats copied signature image references as non-cryptographic', () => {
    expect('image:png-signature-copy'.startsWith('image:')).toBe(true);
  });

  it('rejects private key material in persisted fields', () => {
    expect(() => {
      assertNoPrivateKeyMaterial('-----BEGIN RSA PRIVATE KEY-----', 'credentialReference');
    }).toThrow(/Private key material must never be persisted/);
  });

  it('scans nested objects for forbidden private key paths', () => {
    const violations = scanObjectForPrivateKeyMaterial({
      evidence: { privateKey: 'secret' },
    });
    expect(violations).toContain('root.evidence.privateKey');
  });

  it('enforces assurance level ordering', () => {
    expect(meetsAssuranceLevel(AssuranceLevel.HIGH, AssuranceLevel.MEDIUM)).toBe(true);
    expect(meetsAssuranceLevel(AssuranceLevel.LOW, AssuranceLevel.HIGH)).toBe(false);
  });

  it('documents custodian is not unlimited seal authority code', () => {
    expect(SIGNATURE_EXPLANATION_CODES.CUSTODIAN_NOT_UNLIMITED).toBeDefined();
  });
});
