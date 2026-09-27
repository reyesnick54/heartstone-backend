import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { InMemoryDocumentStorageAdapter } from '../evidence-records/adapters/in-memory-document-storage.adapter';
import { NoopMalwareScanningAdapter } from '../evidence-records/adapters/noop-malware-scanning.adapter';
import { TestMalwareScanningAdapter } from '../evidence-records/adapters/test-malware-scanning.adapter';
import { DOCUMENT_STORAGE_PORT } from '../evidence-records/ports/document-storage.port';
import { MALWARE_SCANNING_PORT } from '../evidence-records/ports/malware-scanning.port';
import { ExternalTrustServiceDigitalSigningAdapter } from './adapters/external-trust-service-digital-signing.adapter';
import { FilesystemEncryptedDocumentStorageAdapter } from './adapters/filesystem-encrypted-document-storage.adapter';
import { HttpMalwareScanningAdapter } from './adapters/http-malware-scanning.adapter';
import { TestDigitalSigningAdapter } from './adapters/test-digital-signing.adapter';
import documentTrustConfig, { type DocumentTrustConfig } from './config/document-trust.config';
import { DOCUMENT_TRUST_CONFIG_KEY } from './document-trust.constants';
import {
  DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE,
  DIGITAL_SIGNING_PROVIDER_TEST,
  DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED,
  MALWARE_SCANNING_PROVIDER_HTTP,
  MALWARE_SCANNING_PROVIDER_NOOP,
  MALWARE_SCANNING_PROVIDER_TEST,
} from './document-trust.constants';
import { DIGITAL_SIGNING_PORT } from './ports/digital-signing.port';
import { DocumentCryptographicEvidenceService } from './services/document-cryptographic-evidence.service';
import { DocumentTrustProductionGateService } from './services/document-trust-production-gate.service';
import { InstrumentCryptographicVerificationService } from './services/instrument-cryptographic-verification.service';
import { InstrumentDocumentTrustService } from './services/instrument-document-trust.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(documentTrustConfig)],
  providers: [
    InMemoryDocumentStorageAdapter,
    FilesystemEncryptedDocumentStorageAdapter,
    NoopMalwareScanningAdapter,
    TestMalwareScanningAdapter,
    HttpMalwareScanningAdapter,
    TestDigitalSigningAdapter,
    ExternalTrustServiceDigitalSigningAdapter,
    DocumentCryptographicEvidenceService,
    InstrumentDocumentTrustService,
    InstrumentCryptographicVerificationService,
    DocumentTrustProductionGateService,
    {
      provide: DOCUMENT_STORAGE_PORT,
      useFactory: (
        configService: ConfigService,
        inMemory: InMemoryDocumentStorageAdapter,
        filesystem: FilesystemEncryptedDocumentStorageAdapter,
      ) => {
        const config = configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
        if (config.storageProvider === DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED) {
          return filesystem;
        }
        return inMemory;
      },
      inject: [
        ConfigService,
        InMemoryDocumentStorageAdapter,
        FilesystemEncryptedDocumentStorageAdapter,
      ],
    },
    {
      provide: MALWARE_SCANNING_PORT,
      useFactory: (
        configService: ConfigService,
        testScanner: TestMalwareScanningAdapter,
        noopScanner: NoopMalwareScanningAdapter,
        httpScanner: HttpMalwareScanningAdapter,
      ) => {
        const config = configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
        switch (config.malwareScanningProvider) {
          case MALWARE_SCANNING_PROVIDER_TEST:
            return testScanner;
          case MALWARE_SCANNING_PROVIDER_HTTP:
            return httpScanner;
          case MALWARE_SCANNING_PROVIDER_NOOP:
          default:
            return noopScanner;
        }
      },
      inject: [
        ConfigService,
        TestMalwareScanningAdapter,
        NoopMalwareScanningAdapter,
        HttpMalwareScanningAdapter,
      ],
    },
    {
      provide: DIGITAL_SIGNING_PORT,
      useFactory: (
        configService: ConfigService,
        testSigning: TestDigitalSigningAdapter,
        externalSigning: ExternalTrustServiceDigitalSigningAdapter,
      ) => {
        const config = configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
        if (config.digitalSigningProvider === DIGITAL_SIGNING_PROVIDER_TEST) {
          return testSigning;
        }
        if (config.digitalSigningProvider === DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE) {
          return externalSigning;
        }
        return testSigning;
      },
      inject: [ConfigService, TestDigitalSigningAdapter, ExternalTrustServiceDigitalSigningAdapter],
    },
  ],
  exports: [
    DOCUMENT_STORAGE_PORT,
    MALWARE_SCANNING_PORT,
    DIGITAL_SIGNING_PORT,
    DocumentCryptographicEvidenceService,
    InstrumentDocumentTrustService,
    InstrumentCryptographicVerificationService,
    DocumentTrustProductionGateService,
    TestMalwareScanningAdapter,
    TestDigitalSigningAdapter,
  ],
})
export class DocumentTrustModule {}
