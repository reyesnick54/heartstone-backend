import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentAuditEventType,
  DocumentAuthenticityStatus,
  DocumentVersion,
  MalwareScanStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DocumentAuditService } from '../audit/document-audit.service';
import { hashDocumentContent } from '../common/document-hash.util';
import { FORBIDDEN_CLIENT_DOCUMENT_FIELDS } from '../evidence-records.constants';
import { DOCUMENT_STORAGE_PORT, DocumentStoragePort } from '../ports/document-storage.port';
import { MALWARE_SCANNING_PORT, MalwareScanningPort } from '../ports/malware-scanning.port';
import { UpdateClassificationDto } from './dto/update-classification.dto';
import { UploadDocumentVersionDto } from './dto/upload-document-version.dto';

export interface UploadDocumentVersionInput {
  documentRecordId: string;
  dto: UploadDocumentVersionDto;
  content: Buffer;
  actorIdentityId: string;
}

@Injectable()
export class DocumentVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: DocumentAuditService,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
    @Inject(MALWARE_SCANNING_PORT)
    private readonly malwareScanner: MalwareScanningPort,
  ) {}

  rejectClientStorageFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_DOCUMENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}"`);
      }
    }
  }

  async uploadVersion(input: UploadDocumentVersionInput): Promise<DocumentVersion> {
    this.rejectClientStorageFields(input.dto as unknown as Record<string, unknown>);

    const record = await this.prisma.documentRecord.findUnique({
      where: { id: input.documentRecordId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!record) {
      throw new NotFoundException(`Document record "${input.documentRecordId}" was not found`);
    }

    const nextVersionNumber = (record.versions[0]?.versionNumber ?? 0) + 1;
    const sha256 = hashDocumentContent(input.content);
    const storageObjectKey = this.buildStorageObjectKey(
      input.documentRecordId,
      nextVersionNumber,
      input.dto.originalFilename,
    );

    const stored = await this.storage.put({
      objectKey: storageObjectKey,
      content: input.content,
      contentType: input.dto.contentType,
      metadata: {
        documentRecordId: input.documentRecordId,
        versionNumber: String(nextVersionNumber),
      },
    });

    const scanResult = await this.malwareScanner.scan({
      storageProvider: stored.storageProvider,
      storageObjectKey: stored.storageObjectKey,
      contentType: input.dto.contentType,
      sizeBytes: stored.sizeBytes,
    });

    const version = await this.prisma.documentVersion.create({
      data: {
        documentRecordId: input.documentRecordId,
        versionNumber: nextVersionNumber,
        originalFilename: input.dto.originalFilename,
        contentType: input.dto.contentType,
        sizeBytes: stored.sizeBytes,
        storageProvider: stored.storageProvider,
        storageObjectKey: stored.storageObjectKey,
        storageVersionId: stored.storageVersionId,
        sha256,
        dateReceived: new Date(),
        language: input.dto.language,
        authenticityStatus: DocumentAuthenticityStatus.NOT_EVALUATED,
        securityClassification: input.dto.securityClassification ?? 'INTERNAL',
        privacyClassification: input.dto.privacyClassification ?? 'NOT_APPLICABLE',
        malwareScanStatus: scanResult.status,
        receivedFromIdentityId: input.actorIdentityId,
        receivedFromExternalAuthorityId: input.dto.receivedFromExternalAuthorityId,
      },
    });

    await this.audit.record({
      documentRecordId: input.documentRecordId,
      documentVersionId: version.id,
      eventType: DocumentAuditEventType.DOCUMENT_UPLOADED,
      actorIdentityId: input.actorIdentityId,
      metadata: {
        versionNumber: nextVersionNumber,
        sha256,
        malwareScanStatus: scanResult.status,
        integrityOnly: true,
      },
    });

    await this.audit.record({
      documentRecordId: input.documentRecordId,
      documentVersionId: version.id,
      eventType: DocumentAuditEventType.DOCUMENT_VERSION_CREATED,
      actorIdentityId: input.actorIdentityId,
      metadata: { versionNumber: nextVersionNumber },
    });

    if (
      scanResult.status === MalwareScanStatus.MALICIOUS ||
      scanResult.status === MalwareScanStatus.SUSPICIOUS
    ) {
      await this.malwareScanner.quarantine(stored.storageObjectKey);
      await this.prisma.documentVersion.update({
        where: { id: version.id },
        data: { malwareScanStatus: MalwareScanStatus.QUARANTINED },
      });
      await this.audit.record({
        documentRecordId: input.documentRecordId,
        documentVersionId: version.id,
        eventType: DocumentAuditEventType.DOCUMENT_QUARANTINED,
        actorIdentityId: input.actorIdentityId,
        metadata: { reason: scanResult.details ?? scanResult.status },
      });
    }

    return version;
  }

  async supersedeVersion(
    documentRecordId: string,
    versionId: string,
    newVersionId: string,
  ): Promise<DocumentVersion> {
    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, documentRecordId },
    });

    if (!version) {
      throw new NotFoundException(`Document version "${versionId}" was not found`);
    }

    if (version.supersededById) {
      throw new BadRequestException('Document version is already superseded');
    }

    return this.prisma.documentVersion.update({
      where: { id: versionId },
      data: { supersededById: newVersionId },
    });
  }

  async updateClassification(
    versionId: string,
    dto: UpdateClassificationDto,
    actorIdentityId: string,
  ): Promise<DocumentVersion> {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Document version "${versionId}" was not found`);
    }

    const updated = await this.prisma.documentVersion.update({
      where: { id: versionId },
      data: {
        securityClassification: dto.securityClassification,
        privacyClassification: dto.privacyClassification,
        confidentialityOrPrivilegeStatus: dto.confidentialityOrPrivilegeStatus,
      },
    });

    await this.audit.record({
      documentRecordId: version.documentRecordId,
      documentVersionId: version.id,
      eventType: DocumentAuditEventType.CLASSIFICATION_CHANGED,
      actorIdentityId,
      metadata: {
        securityClassification: dto.securityClassification,
        privacyClassification: dto.privacyClassification,
        confidentialityOrPrivilegeStatus: dto.confidentialityOrPrivilegeStatus,
      },
    });

    return updated;
  }

  async getVersion(versionId: string): Promise<DocumentVersion> {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Document version "${versionId}" was not found`);
    }

    return version;
  }

  async listVersions(documentRecordId: string): Promise<DocumentVersion[]> {
    return this.prisma.documentVersion.findMany({
      where: { documentRecordId },
      orderBy: { versionNumber: 'asc' },
    });
  }

  private buildStorageObjectKey(
    documentRecordId: string,
    versionNumber: number,
    originalFilename: string,
  ): string {
    const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${documentRecordId}/v${String(versionNumber)}/${randomUUID()}-${safeName}`;
  }
}
