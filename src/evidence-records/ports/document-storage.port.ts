export const DOCUMENT_STORAGE_PORT = Symbol('DOCUMENT_STORAGE_PORT');

export interface DocumentStoragePutInput {
  objectKey: string;
  content: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface DocumentStoragePutResult {
  storageProvider: string;
  storageObjectKey: string;
  storageVersionId?: string;
  sizeBytes: number;
}

export interface DocumentStorageHeadResult {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
  storageVersionId?: string;
}

export interface DocumentStorageExportResult {
  content: Buffer;
  contentType: string;
  sizeBytes: number;
}

export interface DocumentStoragePort {
  readonly providerName: string;

  put(input: DocumentStoragePutInput): Promise<DocumentStoragePutResult>;

  get(objectKey: string): Promise<Buffer>;

  head(objectKey: string): Promise<DocumentStorageHeadResult>;

  copy(sourceKey: string, destinationKey: string): Promise<DocumentStoragePutResult>;

  exportControlled(objectKey: string): Promise<DocumentStorageExportResult>;
}
