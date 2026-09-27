import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DocumentStorageExportResult,
  DocumentStorageHeadResult,
  DocumentStorageIntegrityResult,
  DocumentStoragePort,
  DocumentStoragePutInput,
  DocumentStoragePutResult,
} from '../../evidence-records/ports/document-storage.port';
import { type DocumentTrustConfig } from '../config/document-trust.config';
import { DOCUMENT_TRUST_CONFIG_KEY } from '../document-trust.constants';
import { DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED } from '../document-trust.constants';

interface ObjectSidecar {
  contentType: string;
  sizeBytes: number;
  storageVersionId: string;
  contentSha256: string;
  metadata: Record<string, string>;
  encrypted: boolean;
}

@Injectable()
export class FilesystemEncryptedDocumentStorageAdapter implements DocumentStoragePort {
  readonly providerName = DOCUMENT_STORAGE_PROVIDER_FILESYSTEM_ENCRYPTED;
  readonly isProductionAdapter = true;

  private readonly quarantinedKeys = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  async put(input: DocumentStoragePutInput): Promise<DocumentStoragePutResult> {
    const config = this.getConfig();
    const storageVersionId = randomUUID();
    const contentSha256 = createHash('sha256').update(input.content).digest('hex');
    const payload = config.storageEncryptionEnabled
      ? this.encrypt(input.content, config)
      : input.content;

    const objectPath = this.resolveObjectPath(config.storageRootPath, input.objectKey);
    await mkdir(dirname(objectPath), { recursive: true });
    await writeFile(objectPath, payload);

    const sidecar: ObjectSidecar = {
      contentType: input.contentType,
      sizeBytes: input.content.length,
      storageVersionId,
      contentSha256,
      metadata: input.metadata ?? {},
      encrypted: config.storageEncryptionEnabled,
    };
    await writeFile(`${objectPath}.meta.json`, JSON.stringify(sidecar), 'utf8');

    return {
      storageProvider: this.providerName,
      storageObjectKey: input.objectKey,
      storageVersionId,
      sizeBytes: input.content.length,
    };
  }

  async get(objectKey: string): Promise<Buffer> {
    if (this.quarantinedKeys.has(objectKey)) {
      throw new Error(`Object is quarantined: ${objectKey}`);
    }

    const config = this.getConfig();
    const objectPath = this.resolveObjectPath(config.storageRootPath, objectKey);
    const sidecar = await this.readSidecar(objectPath);
    const payload = await readFile(objectPath);
    const content = sidecar.encrypted ? this.decrypt(payload, config) : payload;
    const actualSha256 = createHash('sha256').update(content).digest('hex');
    if (actualSha256 !== sidecar.contentSha256) {
      throw new Error(`Stored object failed integrity check: ${objectKey}`);
    }
    return content;
  }

  async head(objectKey: string): Promise<DocumentStorageHeadResult> {
    if (this.quarantinedKeys.has(objectKey)) {
      return { exists: false };
    }

    const config = this.getConfig();
    const objectPath = this.resolveObjectPath(config.storageRootPath, objectKey);
    try {
      const sidecar = await this.readSidecar(objectPath);
      await stat(objectPath);
      return {
        exists: true,
        sizeBytes: sidecar.sizeBytes,
        contentType: sidecar.contentType,
        storageVersionId: sidecar.storageVersionId,
      };
    } catch {
      return { exists: false };
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<DocumentStoragePutResult> {
    const content = await this.get(sourceKey);
    const head = await this.head(sourceKey);
    return this.put({
      objectKey: destinationKey,
      content,
      contentType: head.contentType ?? 'application/octet-stream',
      metadata: { copiedFrom: sourceKey },
    });
  }

  async exportControlled(objectKey: string): Promise<DocumentStorageExportResult> {
    const content = await this.get(objectKey);
    const head = await this.head(objectKey);
    return {
      content,
      contentType: head.contentType ?? 'application/octet-stream',
      sizeBytes: head.sizeBytes ?? content.length,
    };
  }

  async verifyContentIntegrity(
    objectKey: string,
    expectedSha256: string,
  ): Promise<DocumentStorageIntegrityResult> {
    try {
      const content = await this.get(objectKey);
      const actualSha256 = createHash('sha256').update(content).digest('hex');
      return {
        valid: actualSha256 === expectedSha256,
        expectedSha256,
        actualSha256,
      };
    } catch {
      return {
        valid: false,
        expectedSha256,
        actualSha256: '',
      };
    }
  }

  async quarantineObject(storageObjectKey: string): Promise<void> {
    const config = this.getConfig();
    const objectPath = this.resolveObjectPath(config.storageRootPath, storageObjectKey);
    const quarantinePath = this.resolveObjectPath(
      config.storageRootPath,
      join('quarantine', storageObjectKey),
    );
    await mkdir(dirname(quarantinePath), { recursive: true });
    try {
      await rename(objectPath, quarantinePath);
      await rename(`${objectPath}.meta.json`, `${quarantinePath}.meta.json`);
    } catch {
      // Object may already be quarantined or missing; still block retrieval.
    }
    this.quarantinedKeys.add(storageObjectKey);
  }

  private getConfig(): DocumentTrustConfig {
    return this.configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
  }

  private resolveObjectPath(root: string, objectKey: string): string {
    const normalized = objectKey.replace(/^\/+/, '').replace(/\.\./g, '_');
    return join(root, normalized);
  }

  private async readSidecar(objectPath: string): Promise<ObjectSidecar> {
    const raw = await readFile(`${objectPath}.meta.json`, 'utf8');
    return JSON.parse(raw) as ObjectSidecar;
  }

  private encrypt(content: Buffer, config: DocumentTrustConfig): Buffer {
    const key = this.resolveEncryptionKey(config);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  private decrypt(payload: Buffer, config: DocumentTrustConfig): Buffer {
    const key = this.resolveEncryptionKey(config);
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private resolveEncryptionKey(config: DocumentTrustConfig): Buffer {
    if (!config.storageDataEncryptionKeyBase64) {
      throw new Error('DOCUMENT_STORAGE_DATA_ENCRYPTION_KEY is required for encrypted storage');
    }
    const key = Buffer.from(config.storageDataEncryptionKeyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error('DOCUMENT_STORAGE_DATA_ENCRYPTION_KEY must decode to 32 bytes');
    }
    return key;
  }
}
