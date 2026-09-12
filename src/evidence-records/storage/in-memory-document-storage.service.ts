import { createHash, randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import {
  DocumentStorageService,
  type PresignedUploadRequest,
  type PresignedUrlResult,
  type StoredDocumentPayload,
} from './document-storage.service';

interface StoredObject {
  content: Buffer;
  contentHash: string;
  mimeType?: string;
  byteSize: number;
  ownerIdentityId: string;
}

@Injectable()
export class InMemoryDocumentStorageService extends DocumentStorageService {
  private readonly objects = new Map<string, StoredObject>();
  private readonly presignedTokens = new Map<
    string,
    { storageReference: string; actorIdentityId: string; expiresAt: Date }
  >();

  async store(
    content: Buffer,
    metadata: { mimeType?: string; actorIdentityId: string },
  ): Promise<StoredDocumentPayload> {
    const storageReference = `mem://${randomUUID()}`;
    const contentHash = createHash('sha256').update(content).digest('hex');

    this.objects.set(storageReference, {
      content,
      contentHash,
      mimeType: metadata.mimeType,
      byteSize: content.length,
      ownerIdentityId: metadata.actorIdentityId,
    });

    return {
      storageReference,
      contentHash,
      mimeType: metadata.mimeType,
      byteSize: content.length,
    };
  }

  async getContent(storageReference: string, actorIdentityId: string): Promise<Buffer> {
    const allowed = await this.verifyAccess(storageReference, actorIdentityId);
    if (!allowed) {
      throw new ForbiddenException('Access to document storage is denied');
    }

    const object = this.objects.get(storageReference);
    if (!object) {
      throw new NotFoundException(`Storage reference "${storageReference}" was not found`);
    }

    return object.content;
  }

  async createPresignedUpload(request: PresignedUploadRequest): Promise<PresignedUrlResult> {
    const storageReference = `mem://${randomUUID()}`;
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    this.presignedTokens.set(token, {
      storageReference,
      actorIdentityId: request.actorIdentityId,
      expiresAt,
    });

    this.objects.set(storageReference, {
      content: Buffer.alloc(0),
      contentHash: request.contentHash,
      mimeType: request.mimeType,
      byteSize: request.byteSize ?? 0,
      ownerIdentityId: request.actorIdentityId,
    });

    return {
      uploadUrl: `presigned://${token}`,
      storageReference,
      expiresAt,
    };
  }

  async verifyAccess(storageReference: string, actorIdentityId: string): Promise<boolean> {
    const object = this.objects.get(storageReference);
    if (!object) {
      return false;
    }

    return object.ownerIdentityId === actorIdentityId;
  }

  completePresignedUpload(token: string, content: Buffer): StoredDocumentPayload {
    const presigned = this.presignedTokens.get(token);
    if (!presigned || presigned.expiresAt < new Date()) {
      throw new ForbiddenException('Presigned upload token is invalid or expired');
    }

    const contentHash = createHash('sha256').update(content).digest('hex');
    const object = this.objects.get(presigned.storageReference);
    if (!object) {
      throw new NotFoundException('Presigned storage reference was not found');
    }

    if (object.contentHash !== contentHash) {
      throw new ForbiddenException('Uploaded content hash does not match declared hash');
    }

    this.objects.set(presigned.storageReference, {
      ...object,
      content,
      byteSize: content.length,
    });
    this.presignedTokens.delete(token);

    return {
      storageReference: presigned.storageReference,
      contentHash,
      mimeType: object.mimeType,
      byteSize: content.length,
    };
  }
}
