import { registerAs } from '@nestjs/config';

import {
  DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE,
  DIGITAL_SIGNING_PROVIDER_TEST,
  DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED,
  DOCUMENT_TRUST_CONFIG_KEY,
  MALWARE_SCANNING_PROVIDER_NOOP,
  MALWARE_SCANNING_PROVIDER_TEST,
} from '../document-trust.constants';

export type DocumentTrustOperationalReadinessState =
  'BLOCKED' | 'CONFIGURED_PENDING_SOVEREIGNTY' | 'READY';

export interface DocumentTrustConfig {
  storageProvider: string;
  storageRootPath: string;
  storageEncryptionEnabled: boolean;
  storageDataEncryptionKeyBase64: string | null;
  storageRegion: string | null;
  storageJurisdiction: string | null;
  storageBackupReplicationExpectations: string | null;
  sovereigntyDeclarationReference: string | null;
  malwareScanningProvider: string;
  malwareScanningEndpoint: string | null;
  malwareScanningApiKey: string | null;
  digitalSigningProvider: string;
  digitalSigningTrustServiceEndpoint: string | null;
  digitalSigningKeyReference: string | null;
  digitalSigningSealKeyReference: string | null;
}

export interface DocumentTrustSovereigntySnapshot {
  configuredProvider: string;
  region: string | null;
  jurisdiction: string | null;
  encryptionEnabled: boolean;
  backupReplicationExpectations: string | null;
  sovereigntyDeclarationReference: string | null;
  operationalReadinessState: DocumentTrustOperationalReadinessState;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

function resolveStorageProvider(nodeEnv: string): string {
  const explicit = process.env.DOCUMENT_STORAGE_PROVIDER?.trim();
  if (explicit) {
    return explicit;
  }
  return nodeEnv === 'test' ? 'in-memory' : DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED;
}

function resolveMalwareProvider(nodeEnv: string): string {
  const explicit = process.env.MALWARE_SCANNING_PROVIDER?.trim();
  if (explicit) {
    return explicit;
  }
  if (nodeEnv === 'test') {
    return MALWARE_SCANNING_PROVIDER_TEST;
  }
  return MALWARE_SCANNING_PROVIDER_NOOP;
}

function resolveSigningProvider(nodeEnv: string): string {
  const explicit = process.env.DOCUMENT_SIGNING_PROVIDER?.trim();
  if (explicit) {
    return explicit;
  }
  if (nodeEnv === 'test') {
    return DIGITAL_SIGNING_PROVIDER_TEST;
  }
  return DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE;
}

export function buildDocumentTrustSovereigntySnapshot(
  config: DocumentTrustConfig,
): DocumentTrustSovereigntySnapshot {
  const sovereigntyDeclared = Boolean(config.sovereigntyDeclarationReference?.trim());
  const storageConfigured =
    config.storageProvider === DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED &&
    Boolean(config.storageRootPath) &&
    Boolean(config.storageDataEncryptionKeyBase64);

  let operationalReadinessState: DocumentTrustOperationalReadinessState = 'BLOCKED';

  if (storageConfigured && sovereigntyDeclared) {
    operationalReadinessState = 'READY';
  } else if (storageConfigured) {
    operationalReadinessState = 'CONFIGURED_PENDING_SOVEREIGNTY';
  }

  return {
    configuredProvider: config.storageProvider,
    region: config.storageRegion,
    jurisdiction: config.storageJurisdiction,
    encryptionEnabled: config.storageEncryptionEnabled,
    backupReplicationExpectations: config.storageBackupReplicationExpectations,
    sovereigntyDeclarationReference: config.sovereigntyDeclarationReference,
    operationalReadinessState,
  };
}

export default registerAs(DOCUMENT_TRUST_CONFIG_KEY, (): DocumentTrustConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    storageProvider: resolveStorageProvider(nodeEnv),
    storageRootPath: process.env.DOCUMENT_STORAGE_ROOT_PATH?.trim() ?? '',
    storageEncryptionEnabled: parseBooleanEnv(
      process.env.DOCUMENT_STORAGE_ENCRYPTION_ENABLED,
      true,
    ),
    storageDataEncryptionKeyBase64:
      process.env.DOCUMENT_STORAGE_DATA_ENCRYPTION_KEY?.trim() ?? null,
    storageRegion: process.env.DOCUMENT_STORAGE_REGION?.trim() ?? null,
    storageJurisdiction: process.env.DOCUMENT_STORAGE_JURISDICTION?.trim() ?? null,
    storageBackupReplicationExpectations:
      process.env.DOCUMENT_STORAGE_BACKUP_REPLICATION_EXPECTATIONS?.trim() ?? null,
    sovereigntyDeclarationReference:
      process.env.DOCUMENT_TRUST_SOVEREIGNTY_DECLARATION_REFERENCE?.trim() ?? null,
    malwareScanningProvider: resolveMalwareProvider(nodeEnv),
    malwareScanningEndpoint: process.env.MALWARE_SCANNING_ENDPOINT?.trim() ?? null,
    malwareScanningApiKey: process.env.MALWARE_SCANNING_API_KEY?.trim() ?? null,
    digitalSigningProvider: resolveSigningProvider(nodeEnv),
    digitalSigningTrustServiceEndpoint:
      process.env.DOCUMENT_SIGNING_TRUST_SERVICE_ENDPOINT?.trim() ?? null,
    digitalSigningKeyReference: process.env.DOCUMENT_SIGNING_KEY_REFERENCE?.trim() ?? null,
    digitalSigningSealKeyReference: process.env.DOCUMENT_SIGNING_SEAL_KEY_REFERENCE?.trim() ?? null,
  };
});
