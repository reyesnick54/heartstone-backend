import {
  type CryptographicCredentialStatus,
  type KeyProtectionType,
  type RevocationCheckMethod,
} from '@prisma/client';

export const DIGITAL_SIGNATURE_PROVIDER_PORT = Symbol('DIGITAL_SIGNATURE_PROVIDER_PORT');

export interface SigningRequestContext {
  digest: string;
  credentialReference: string;
  credentialProvider: string;
  signatorySubject: string;
}

export interface PreparedSigningRequest {
  requestId: string;
  digest: string;
  algorithm: string;
}

export interface SignatureResult {
  signatureValueReference: string;
  timestampEvidence: Record<string, unknown>;
  algorithm: string;
}

export interface CertificateStatusResult {
  status: CryptographicCredentialStatus;
  validFrom: Date;
  validUntil: Date;
  subject: string;
  serial: string;
  issuer: string;
}

export interface RevocationStatusResult {
  status: CryptographicCredentialStatus;
  checkedAt: Date;
  method: RevocationCheckMethod;
}

export interface SignatureValidationInput {
  digest: string;
  signatureValueReference: string;
  credentialReference: string;
  credentialProvider: string;
}

export interface SignatureValidationResult {
  valid: boolean;
  outcome: 'VALID' | 'INVALID' | 'IMAGE_ONLY' | 'HASH_MISMATCH';
  evidence: Record<string, unknown>;
}

export interface DigitalSignatureProviderPort {
  prepareSigningRequest(context: SigningRequestContext): Promise<PreparedSigningRequest>;
  signDigest(requestId: string, digest: string): Promise<SignatureResult>;
  validateSignature(input: SignatureValidationInput): Promise<SignatureValidationResult>;
  getCertificateStatus(
    credentialProvider: string,
    credentialReference: string,
  ): Promise<CertificateStatusResult>;
  getRevocationStatus(
    credentialProvider: string,
    credentialReference: string,
  ): Promise<RevocationStatusResult>;
}

export interface CredentialMetadataInput {
  credentialProvider: string;
  credentialReference: string;
  certificateSubject: string;
  certificateSerial: string;
  certificateIssuer: string;
  algorithm: string;
  keyProtectionType: KeyProtectionType;
  validFrom: Date;
  validUntil: Date;
}
