import { Injectable } from '@nestjs/common';

import { DOCUMENT_STORAGE_PROVIDER_IN_MEMORY } from '../evidence-records.constants';
import {
  DocumentStorageExportResult,
  DocumentStorageHeadResult,
  DocumentStoragePort,
  DocumentStoragePutInput,
  DocumentStoragePutResult,
} from '../ports/document-storage.port';

interface StoredObject {
  content: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  versionId: string;
}

@Injectable()
export class InMemoryDocumentStorageAdapter implements DocumentStoragePort {
  readonly providerName = DOCUMENT_STORAGE_PROVIDER_IN_MEMORY;

  private readonly objects = new Map<string, StoredObject>();

  put(input: DocumentStoragePutInput): Promise<DocumentStoragePutResult> {
    const versionId = `v1-${input.objectKey}`;
    this.objects.set(input.objectKey, {
      content: Buffer.from(input.content),
      contentType: input.contentType,
      metadata: input.metadata ?? {},
      versionId,
    });

    return Promise.resolve({
      storageProvider: this.providerName,
      storageObjectKey: input.objectKey,
      storageVersionId: versionId,
      sizeBytes: input.content.length,
    });
  }

  get(objectKey: string): Promise<Buffer> {
    const stored = this.objects.get(objectKey);
    if (!stored) {
      return Promise.reject(new Error(`Object not found: ${objectKey}`));
    }

    return Promise.resolve(Buffer.from(stored.content));
  }

  head(objectKey: string): Promise<DocumentStorageHeadResult> {
    const stored = this.objects.get(objectKey);
    if (!stored) {
      return Promise.resolve({ exists: false });
    }

    return Promise.resolve({
      exists: true,
      sizeBytes: stored.content.length,
      contentType: stored.contentType,
      storageVersionId: stored.versionId,
    });
  }

  copy(sourceKey: string, destinationKey: string): Promise<DocumentStoragePutResult> {
    const source = this.objects.get(sourceKey);
    if (!source) {
      return Promise.reject(new Error(`Source object not found: ${sourceKey}`));
    }

    return this.put({
      objectKey: destinationKey,
      content: Buffer.from(source.content),
      contentType: source.contentType,
      metadata: { ...source.metadata, copiedFrom: sourceKey },
    });
  }

  exportControlled(objectKey: string): Promise<DocumentStorageExportResult> {
    const stored = this.objects.get(objectKey);
    if (!stored) {
      return Promise.reject(new Error(`Object not found: ${objectKey}`));
    }

    return Promise.resolve({
      content: Buffer.from(stored.content),
      contentType: stored.contentType,
      sizeBytes: stored.content.length,
    });
  }

  clear(): void {
    this.objects.clear();
  }
}
