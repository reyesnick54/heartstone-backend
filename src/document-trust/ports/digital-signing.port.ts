import { type SigningAlgorithmId } from '../document-trust.constants';

export const DIGITAL_SIGNING_PORT = Symbol('DIGITAL_SIGNING_PORT');

export interface DigitalSignContentInput {
  content: Buffer;
  contentHashSha256: string;
  algorithmId?: SigningAlgorithmId;
  keyReference?: string;
  signerContext?: Record<string, string>;
}

export interface DigitalSealContentInput {
  content: Buffer;
  contentHashSha256: string;
  algorithmId?: SigningAlgorithmId;
  keyReference?: string;
  institutionReference?: string;
}

export interface DigitalSignatureEvidence {
  algorithmId: SigningAlgorithmId;
  contentHashSha256: string;
  signatureBase64: string;
  keyReference: string;
  certificateReference?: string;
  providerName: string;
  signedAt: Date;
  signerContext?: Record<string, string>;
  detached: boolean;
  certificateChainReferences?: string[];
}

export interface DigitalSealEvidence {
  algorithmId: SigningAlgorithmId;
  contentHashSha256: string;
  sealBase64: string;
  keyReference: string;
  providerName: string;
  sealedAt: Date;
  institutionReference?: string;
}

export interface DigitalSignatureVerificationInput {
  content: Buffer;
  contentHashSha256: string;
  evidence: DigitalSignatureEvidence;
}

export interface DigitalSealVerificationInput {
  content: Buffer;
  contentHashSha256: string;
  evidence: DigitalSealEvidence;
}

export interface DigitalVerificationResult {
  valid: boolean;
  reason?: string;
}

export interface DigitalSigningPort {
  readonly providerName: string;
  /** When false, production startup must fail if this adapter is active. */
  readonly isProductionAdapter: boolean;

  signContent(input: DigitalSignContentInput): Promise<DigitalSignatureEvidence>;

  verifySignature(input: DigitalSignatureVerificationInput): Promise<DigitalVerificationResult>;

  applySeal(input: DigitalSealContentInput): Promise<DigitalSealEvidence>;

  verifySeal(input: DigitalSealVerificationInput): Promise<DigitalVerificationResult>;
}
