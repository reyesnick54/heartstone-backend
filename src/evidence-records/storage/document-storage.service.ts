export interface StoredDocumentPayload {
  storageReference: string;
  contentHash: string;
  mimeType?: string;
  byteSize?: number;
}

export interface PresignedUploadRequest {
  storageReference: string;
  contentHash: string;
  mimeType?: string;
  byteSize?: number;
  actorIdentityId: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  storageReference: string;
  expiresAt: Date;
}

export abstract class DocumentStorageService {
  abstract store(
    content: Buffer,
    metadata: { mimeType?: string; actorIdentityId: string },
  ): Promise<StoredDocumentPayload>;

  abstract getContent(storageReference: string, actorIdentityId: string): Promise<Buffer>;

  abstract createPresignedUpload(request: PresignedUploadRequest): Promise<PresignedUrlResult>;

  abstract verifyAccess(storageReference: string, actorIdentityId: string): Promise<boolean>;
}
