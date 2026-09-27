export const DOCUMENT_TRUST_CONFIG_KEY = 'documentTrust';
/** @deprecated Use DOCUMENT_TRUST_CONFIG_KEY — kept for Nest registerAs token compatibility. */
export const DOCUMENT_TRUST_CONFIG = DOCUMENT_TRUST_CONFIG_KEY;

export const DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED = 'filesystem-encrypted';

export const MALWARE_SCANNING_PROVIDER_HTTP = 'http-malware-scanner';
export const MALWARE_SCANNING_PROVIDER_TEST = 'test-malware-scanner';
export const MALWARE_SCANNING_PROVIDER_NOOP = 'noop-malware-scanner';

export const DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE = 'external-trust-service';
export const DIGITAL_SIGNING_PROVIDER_TEST = 'test-digital-signing';

export const DOCUMENT_TRUST_READINESS_CODES = {
  PROHIBITED_STORAGE_ADAPTER: 'PROHIBITED_OFFICIAL_DOCUMENT_STORAGE_ADAPTER',
  PROHIBITED_MALWARE_ADAPTER: 'PROHIBITED_MALWARE_SCANNING_ADAPTER',
  PROHIBITED_SIGNING_ADAPTER: 'PROHIBITED_DIGITAL_SIGNING_ADAPTER',
  SOVEREIGNTY_NOT_DECLARED: 'DATA_SOVEREIGNTY_NOT_DECLARED',
  STORAGE_NOT_CONFIGURED: 'DOCUMENT_STORAGE_NOT_CONFIGURED',
  MALWARE_SCANNER_NOT_CONFIGURED: 'MALWARE_SCANNER_NOT_CONFIGURED',
  SIGNING_NOT_CONFIGURED: 'DIGITAL_SIGNING_NOT_CONFIGURED',
} as const;

/** Algorithm identifiers for signing agility (including reserved post-quantum slot). */
export const SIGNING_ALGORITHM_IDS = {
  RSA_PSS_SHA256: 'RSA-PSS-SHA256',
  ECDSA_P256_SHA256: 'ECDSA-P256-SHA256',
  RESERVED_POST_QUANTUM: 'RESERVED-PQ-UNSPECIFIED',
} as const;

export type SigningAlgorithmId = (typeof SIGNING_ALGORITHM_IDS)[keyof typeof SIGNING_ALGORITHM_IDS];

export interface StoredSignatureEvidence {
  algorithmId: SigningAlgorithmId;
  contentHashSha256: string;
  signatureBase64: string;
  keyReference: string;
  certificateReference?: string;
  providerName: string;
  signedAt: string;
  signerContext?: Record<string, string>;
  detached: boolean;
  certificateChainReferences?: string[];
}

export interface StoredSealEvidence {
  algorithmId: SigningAlgorithmId;
  contentHashSha256: string;
  sealBase64: string;
  keyReference: string;
  providerName: string;
  sealedAt: string;
  institutionReference?: string;
}

export const CRYPTOGRAPHIC_EVIDENCE_JSON_KEYS = {
  signature: 'signatureEvidence',
  seal: 'sealEvidence',
} as const;
