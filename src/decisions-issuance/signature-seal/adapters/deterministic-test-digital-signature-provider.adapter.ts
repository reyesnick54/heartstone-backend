import { createHash } from 'node:crypto';

import { CryptographicCredentialStatus, RevocationCheckMethod } from '@prisma/client';

import {
  type CertificateStatusResult,
  type CredentialMetadataInput,
  type DigitalSignatureProviderPort,
  type PreparedSigningRequest,
  type RevocationStatusResult,
  type SignatureResult,
  type SignatureValidationInput,
  type SignatureValidationResult,
  type SigningRequestContext,
} from '../ports/digital-signature-provider.port';

const TEST_PROVIDER = 'deterministic-test-provider';

/**
 * Deterministic test adapter. Does not claim legal validity.
 * Never stores or returns private key material.
 */
export class DeterministicTestDigitalSignatureProvider implements DigitalSignatureProviderPort {
  private readonly certificateRegistry = new Map<string, CredentialMetadataInput>();
  private readonly revocationRegistry = new Map<string, CryptographicCredentialStatus>();
  private readonly signatureRegistry = new Map<string, string>();

  registerCredential(metadata: CredentialMetadataInput): void {
    const key = this.credentialKey(metadata.credentialProvider, metadata.credentialReference);
    this.certificateRegistry.set(key, metadata);
    this.revocationRegistry.set(key, CryptographicCredentialStatus.ACTIVE);
  }

  setRevocationStatus(
    credentialProvider: string,
    credentialReference: string,
    status: CryptographicCredentialStatus,
  ): void {
    this.revocationRegistry.set(
      this.credentialKey(credentialProvider, credentialReference),
      status,
    );
  }

  prepareSigningRequest(context: SigningRequestContext): Promise<PreparedSigningRequest> {
    const requestId = createHash('sha256')
      .update(`${context.credentialProvider}:${context.credentialReference}:${context.digest}`)
      .digest('hex');
    return Promise.resolve({
      requestId,
      digest: context.digest,
      algorithm: 'SHA256withRSA-TEST',
    });
  }

  signDigest(requestId: string, digest: string): Promise<SignatureResult> {
    const signatureValueReference = createHash('sha256')
      .update(`sig:${requestId}:${digest}`)
      .digest('hex');
    this.signatureRegistry.set(signatureValueReference, digest);
    return Promise.resolve({
      signatureValueReference,
      timestampEvidence: {
        provider: TEST_PROVIDER,
        requestId,
        signedAt: new Date().toISOString(),
      },
      algorithm: 'SHA256withRSA-TEST',
    });
  }

  validateSignature(input: SignatureValidationInput): Promise<SignatureValidationResult> {
    if (input.signatureValueReference.startsWith('image:')) {
      return Promise.resolve({
        valid: false,
        outcome: 'IMAGE_ONLY',
        evidence: { reason: 'Copied signature image is not a valid cryptographic signature' },
      });
    }

    const boundDigest = this.signatureRegistry.get(input.signatureValueReference);
    if (!boundDigest) {
      return Promise.resolve({
        valid: false,
        outcome: 'INVALID',
        evidence: { reason: 'Unknown signature reference' },
      });
    }

    if (boundDigest !== input.digest) {
      return Promise.resolve({
        valid: false,
        outcome: 'HASH_MISMATCH',
        evidence: { expectedDigest: boundDigest, providedDigest: input.digest },
      });
    }

    const revocationStatus =
      this.revocationRegistry.get(
        this.credentialKey(input.credentialProvider, input.credentialReference),
      ) ?? CryptographicCredentialStatus.REVOKED;
    if (revocationStatus === CryptographicCredentialStatus.REVOKED) {
      return Promise.resolve({
        valid: false,
        outcome: 'INVALID',
        evidence: { reason: 'Certificate revoked at validation time' },
      });
    }

    return Promise.resolve({
      valid: true,
      outcome: 'VALID',
      evidence: { validatedAt: new Date().toISOString() },
    });
  }

  getCertificateStatus(
    credentialProvider: string,
    credentialReference: string,
  ): Promise<CertificateStatusResult> {
    const metadata = this.certificateRegistry.get(
      this.credentialKey(credentialProvider, credentialReference),
    );
    if (!metadata) {
      return Promise.resolve({
        status: CryptographicCredentialStatus.REVOKED,
        validFrom: new Date(0),
        validUntil: new Date(0),
        subject: '',
        serial: '',
        issuer: '',
      });
    }

    const now = new Date();
    let status =
      this.revocationRegistry.get(this.credentialKey(credentialProvider, credentialReference)) ??
      CryptographicCredentialStatus.ACTIVE;

    if (status === CryptographicCredentialStatus.ACTIVE && now > metadata.validUntil) {
      status = CryptographicCredentialStatus.EXPIRED;
    }
    if (status === CryptographicCredentialStatus.ACTIVE && now < metadata.validFrom) {
      status = CryptographicCredentialStatus.SUSPENDED;
    }

    return Promise.resolve({
      status,
      validFrom: metadata.validFrom,
      validUntil: metadata.validUntil,
      subject: metadata.certificateSubject,
      serial: metadata.certificateSerial,
      issuer: metadata.certificateIssuer,
    });
  }

  getRevocationStatus(
    credentialProvider: string,
    credentialReference: string,
  ): Promise<RevocationStatusResult> {
    const status =
      this.revocationRegistry.get(this.credentialKey(credentialProvider, credentialReference)) ??
      CryptographicCredentialStatus.REVOKED;

    return Promise.resolve({
      status,
      checkedAt: new Date(),
      method: RevocationCheckMethod.TEST_STUB,
    });
  }

  private credentialKey(provider: string, reference: string): string {
    return `${provider}::${reference}`;
  }
}
