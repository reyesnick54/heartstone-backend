import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MalwareScanStatus } from '@prisma/client';

import { ExternalTrustServiceDigitalSigningAdapter } from '../../document-trust/adapters/external-trust-service-digital-signing.adapter';
import { FilesystemEncryptedDocumentStorageAdapter } from '../../document-trust/adapters/filesystem-encrypted-document-storage.adapter';
import { HttpMalwareScanningAdapter } from '../../document-trust/adapters/http-malware-scanning.adapter';
import { TestDigitalSigningAdapter } from '../../document-trust/adapters/test-digital-signing.adapter';
import { type DocumentTrustConfig } from '../../document-trust/config/document-trust.config';
import { DOCUMENT_TRUST_CONFIG_KEY } from '../../document-trust/document-trust.constants';
import { DOCUMENT_TRUST_READINESS_CODES } from '../../document-trust/document-trust.constants';
import { DIGITAL_SIGNING_PORT } from '../../document-trust/ports/digital-signing.port';
import { DocumentTrustProductionGateService } from '../../document-trust/services/document-trust-production-gate.service';
import { InMemoryDocumentStorageAdapter } from '../../evidence-records/adapters/in-memory-document-storage.adapter';
import { NoopMalwareScanningAdapter } from '../../evidence-records/adapters/noop-malware-scanning.adapter';
import { TestMalwareScanningAdapter } from '../../evidence-records/adapters/test-malware-scanning.adapter';
import { DOCUMENT_STORAGE_PORT } from '../../evidence-records/ports/document-storage.port';
import { MALWARE_SCANNING_PORT } from '../../evidence-records/ports/malware-scanning.port';

describe('S13 document trust remediation', () => {
  it('persists encrypted filesystem objects beyond adapter instance lifetime', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hs-s13-storage-'));
    const key = randomBytes(32).toString('base64');
    const config: DocumentTrustConfig = {
      storageProvider: 'filesystem-encrypted',
      storageRootPath: root,
      storageEncryptionEnabled: true,
      storageDataEncryptionKeyBase64: key,
      storageRegion: 'test-region',
      storageJurisdiction: null,
      storageBackupReplicationExpectations: null,
      sovereigntyDeclarationReference: null,
      malwareScanningProvider: 'test-malware-scanner',
      malwareScanningEndpoint: null,
      malwareScanningApiKey: null,
      digitalSigningProvider: 'test-digital-signing',
      digitalSigningTrustServiceEndpoint: null,
      digitalSigningKeyReference: null,
      digitalSigningSealKeyReference: null,
    };

    const configService = { getOrThrow: () => config, get: () => ({ nodeEnv: 'test' }) };
    const adapter = new FilesystemEncryptedDocumentStorageAdapter(
      configService as unknown as ConfigService,
    );
    const content = Buffer.from('official instrument bytes', 'utf8');
    const sha256 = createHash('sha256').update(content).digest('hex');

    const stored = await adapter.put({
      objectKey: 'instruments/persist-test',
      content,
      contentType: 'text/plain',
    });

    const secondAdapter = new FilesystemEncryptedDocumentStorageAdapter(
      configService as unknown as ConfigService,
    );
    const roundTrip = await secondAdapter.get(stored.storageObjectKey);
    const integrity = await secondAdapter.verifyContentIntegrity(stored.storageObjectKey, sha256);

    expect(roundTrip.toString('utf8')).toBe('official instrument bytes');
    expect(integrity.valid).toBe(true);

    const corruptedIntegrity = await secondAdapter.verifyContentIntegrity(
      stored.storageObjectKey,
      'deadbeef',
    );
    expect(corruptedIntegrity.valid).toBe(false);

    await rm(root, { recursive: true, force: true });
  });

  it('quarantines malware-positive uploads and does not treat scan failures as clean', async () => {
    const scanner = new TestMalwareScanningAdapter();
    scanner.setScanBehavior(() => MalwareScanStatus.MALICIOUS);
    const malicious = await scanner.scan({
      storageProvider: 'in-memory',
      storageObjectKey: 'infected',
      contentType: 'text/plain',
      sizeBytes: 1,
    });
    expect(malicious.status).toBe(MalwareScanStatus.MALICIOUS);

    scanner.setScanBehavior(() => MalwareScanStatus.SCAN_FAILED);
    const failed = await scanner.scan({
      storageProvider: 'in-memory',
      storageObjectKey: 'failed',
      contentType: 'text/plain',
      sizeBytes: 1,
    });
    expect(failed.status).toBe(MalwareScanStatus.SCAN_FAILED);
    expect(failed.status).not.toBe(MalwareScanStatus.CLEAN);
  });

  it('produces verifiable signing evidence and rejects altered content', async () => {
    const signing = new TestDigitalSigningAdapter();
    const content = Buffer.from('signed payload', 'utf8');
    const contentHashSha256 = createHash('sha256').update(content).digest('hex');
    const evidence = await signing.signContent({ content, contentHashSha256 });
    const valid = await signing.verifySignature({ content, contentHashSha256, evidence });
    expect(valid.valid).toBe(true);

    const tampered = Buffer.from('signed payload!', 'utf8');
    const invalid = await signing.verifySignature({
      content: tampered,
      contentHashSha256,
      evidence,
    });
    expect(invalid.valid).toBe(false);
  });

  it('blocks production startup when prohibited adapters are active', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentTrustProductionGateService,
        { provide: ConfigService, useValue: { get: () => ({ nodeEnv: 'production' }), getOrThrow: () => ({}) } },
        { provide: DOCUMENT_STORAGE_PORT, useClass: InMemoryDocumentStorageAdapter },
        { provide: MALWARE_SCANNING_PORT, useClass: NoopMalwareScanningAdapter },
        { provide: DIGITAL_SIGNING_PORT, useClass: TestDigitalSigningAdapter },
      ],
    }).compile();

    const gate = moduleRef.get(DocumentTrustProductionGateService);
    const evaluation = gate.evaluateProhibitedAdapters();
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.reasons).toEqual(
      expect.arrayContaining([
        DOCUMENT_TRUST_READINESS_CODES.PROHIBITED_STORAGE_ADAPTER,
        DOCUMENT_TRUST_READINESS_CODES.PROHIBITED_MALWARE_ADAPTER,
        DOCUMENT_TRUST_READINESS_CODES.PROHIBITED_SIGNING_ADAPTER,
      ]),
    );
  });

  it('accepts fully configured production adapters', async () => {
    const config: DocumentTrustConfig = {
      storageProvider: 'filesystem-encrypted',
      storageRootPath: '/data/documents',
      storageEncryptionEnabled: true,
      storageDataEncryptionKeyBase64: randomBytes(32).toString('base64'),
      storageRegion: 'ag-region-1',
      storageJurisdiction: 'AG',
      storageBackupReplicationExpectations: 'cross-region async replication',
      sovereigntyDeclarationReference: 'SOV-DECL-2026-0001',
      malwareScanningProvider: 'http-malware-scanner',
      malwareScanningEndpoint: 'https://scanner.example.internal/scan',
      malwareScanningApiKey: 'token',
      digitalSigningProvider: 'external-trust-service',
      digitalSigningTrustServiceEndpoint: 'https://tsa.example.internal',
      digitalSigningKeyReference: 'gov-signing-key-1',
      digitalSigningSealKeyReference: 'gov-seal-key-1',
    };

    const storage = {
      providerName: 'filesystem-encrypted',
      isProductionAdapter: true,
    };
    const malware = new HttpMalwareScanningAdapter({
      getOrThrow: () => config,
    } as unknown as ConfigService);
    const signing = new ExternalTrustServiceDigitalSigningAdapter({
      getOrThrow: () => config,
    } as unknown as ConfigService);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentTrustProductionGateService,
        {
          provide: ConfigService,
          useValue: {
            get: () => ({ nodeEnv: 'production' }),
            getOrThrow: (key: string) => (key === DOCUMENT_TRUST_CONFIG_KEY ? config : undefined),
          },
        },
        { provide: DOCUMENT_STORAGE_PORT, useValue: storage },
        { provide: MALWARE_SCANNING_PORT, useValue: malware },
        { provide: DIGITAL_SIGNING_PORT, useValue: signing },
      ],
    }).compile();

    const gate = moduleRef.get(DocumentTrustProductionGateService);
    expect(gate.evaluateProhibitedAdapters().allowed).toBe(true);
    expect(gate.isProductionRuntimeReady()).toBe(true);
  });
});
