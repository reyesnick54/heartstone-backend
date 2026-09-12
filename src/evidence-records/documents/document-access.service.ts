import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentAuditEventType,
  DocumentSecurityClassification,
  DocumentVersion,
  MalwareScanStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DocumentAuditService } from '../audit/document-audit.service';
import { DOCUMENT_STORAGE_PORT, DocumentStoragePort } from '../ports/document-storage.port';

export interface DocumentAccessContext {
  actorIdentityId: string;
  isOfficial: boolean;
  applicantIdentityId?: string;
}

const BLOCKED_SCAN_STATUSES: MalwareScanStatus[] = [
  MalwareScanStatus.MALICIOUS,
  MalwareScanStatus.QUARANTINED,
  MalwareScanStatus.SUSPICIOUS,
];

@Injectable()
export class DocumentAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: DocumentAuditService,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
  ) {}

  async assertDownloadAllowed(
    version: DocumentVersion,
    context: DocumentAccessContext,
  ): Promise<void> {
    if (BLOCKED_SCAN_STATUSES.includes(version.malwareScanStatus)) {
      await this.audit.record({
        documentRecordId: version.documentRecordId,
        documentVersionId: version.id,
        eventType: DocumentAuditEventType.DOCUMENT_ACCESS_DENIED,
        actorIdentityId: context.actorIdentityId,
        metadata: { reason: 'malware_scan_blocked', status: version.malwareScanStatus },
      });
      throw new ForbiddenException('Document content is not available for download');
    }

    if (!context.isOfficial) {
      await this.assertApplicantAccess(version, context);
    }

    await this.assertClassificationAccess(version, context);
  }

  async downloadVersion(
    versionId: string,
    context: DocumentAccessContext,
  ): Promise<{ content: Buffer; contentType: string; filename: string }> {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Document version "${versionId}" was not found`);
    }

    await this.assertDownloadAllowed(version, context);

    const exported = await this.storage.exportControlled(version.storageObjectKey);

    await this.audit.record({
      documentRecordId: version.documentRecordId,
      documentVersionId: version.id,
      eventType: DocumentAuditEventType.DOCUMENT_DOWNLOADED,
      actorIdentityId: context.actorIdentityId,
      metadata: { contentType: version.contentType, sizeBytes: version.sizeBytes },
    });

    return {
      content: exported.content,
      contentType: version.contentType,
      filename: version.originalFilename,
    };
  }

  private async assertApplicantAccess(
    version: DocumentVersion,
    context: DocumentAccessContext,
  ): Promise<void> {
    const associations = await this.prisma.documentAssociation.findMany({
      where: { documentVersionId: version.id },
    });

    if (associations.length === 0) {
      await this.recordAccessDenied(version, context, 'no_association');
      throw new ForbiddenException('Document is not accessible to this identity');
    }

    if (version.receivedFromIdentityId === context.actorIdentityId) {
      return;
    }

    const linkedToApplicant = await this.isLinkedToApplicant(associations, context);
    if (!linkedToApplicant) {
      await this.recordAccessDenied(version, context, 'unrelated_applicant');
      throw new ForbiddenException('Document is not accessible to this identity');
    }
  }

  private async isLinkedToApplicant(
    associations: { targetType: string; targetId: string }[],
    context: DocumentAccessContext,
  ): Promise<boolean> {
    for (const association of associations) {
      if (association.targetType === 'APPLICATION') {
        const application = await this.prisma.application.findUnique({
          where: { id: association.targetId },
          select: { applicantIdentityId: true },
        });
        if (application?.applicantIdentityId === context.actorIdentityId) {
          return true;
        }
      }

      if (association.targetType === 'APPLICATION_SUBMISSION') {
        const submission = await this.prisma.applicationSubmission.findUnique({
          where: { id: association.targetId },
          include: { application: { select: { applicantIdentityId: true } } },
        });
        if (submission?.application.applicantIdentityId === context.actorIdentityId) {
          return true;
        }
      }

      if (association.targetType === 'CASE') {
        const caseRecord = await this.prisma.case.findUnique({
          where: { id: association.targetId },
          include: { application: { select: { applicantIdentityId: true } } },
        });
        if (caseRecord?.application.applicantIdentityId === context.actorIdentityId) {
          return true;
        }
      }
    }

    return false;
  }

  private async assertClassificationAccess(
    version: DocumentVersion,
    context: DocumentAccessContext,
  ): Promise<void> {
    if (context.isOfficial) {
      return;
    }

    const restricted: DocumentSecurityClassification[] = [
      DocumentSecurityClassification.CONFIDENTIAL,
      DocumentSecurityClassification.RESTRICTED,
      DocumentSecurityClassification.HIGHLY_RESTRICTED,
    ];

    if (restricted.includes(version.securityClassification)) {
      await this.recordAccessDenied(version, context, 'classification_restricted');
      throw new ForbiddenException('Document classification prevents applicant access');
    }
  }

  private async recordAccessDenied(
    version: DocumentVersion,
    context: DocumentAccessContext,
    reason: string,
  ): Promise<void> {
    await this.audit.record({
      documentRecordId: version.documentRecordId,
      documentVersionId: version.id,
      eventType: DocumentAuditEventType.DOCUMENT_ACCESS_DENIED,
      actorIdentityId: context.actorIdentityId,
      metadata: { reason },
    });
  }
}
