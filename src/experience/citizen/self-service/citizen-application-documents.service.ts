import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  type CaseStatus,
  DocumentAssociationRole,
  DocumentAssociationTargetType,
  DocumentAuthenticityStatus,
  DocumentPrivacyClassification,
  DocumentSourceType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { hashDocumentContent } from '../../../evidence-records/common/document-hash.util';
import { DocumentAssociationsService } from '../../../evidence-records/documents/document-associations.service';
import { DocumentRecordsService } from '../../../evidence-records/documents/document-records.service';
import { DocumentVersionsService } from '../../../evidence-records/documents/document-versions.service';
import { SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import {
  CITIZEN_DOCUMENT_UPLOAD_DISCLAIMER,
  CITIZEN_SELF_SERVICE_ERROR_CODES,
  CITIZEN_UPLOAD_MAX_BYTES,
  CITIZEN_UPLOAD_OPEN_CASE_STATUSES,
} from './citizen-self-service.constants';
import {
  type CitizenApplicationDocumentUploadDto,
  type UploadCitizenApplicationDocumentDto,
} from './dto/citizen-self-service.dto';

/**
 * Citizen upload of a supporting document to their own application. Storage, hashing and
 * malware scanning go through the existing document services; the version is recorded as an
 * applicant upload with authenticity NOT_EVALUATED. Upload never marks anything verified.
 */
@Injectable()
export class CitizenApplicationDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: DocumentRecordsService,
    private readonly versions: DocumentVersionsService,
    private readonly associations: DocumentAssociationsService,
    private readonly audit: SecurityAuditService,
  ) {}

  async upload(
    session: SessionContextDto,
    applicationId: string,
    dto: UploadCitizenApplicationDocumentDto,
  ): Promise<CitizenApplicationDocumentUploadDto> {
    const identityId = session.identityId;
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, applicantIdentityId: identityId },
      select: {
        id: true,
        status: true,
        governmentService: { select: { responsibleInstitutionId: true } },
        case: { select: { id: true, status: true } },
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    this.assertAcceptsUploads(application.status, application.case?.status);

    const content = Buffer.from(dto.contentBase64, 'base64');
    if (content.length === 0) {
      throw new BadRequestException({
        message: 'The uploaded file is empty',
        code: CITIZEN_SELF_SERVICE_ERROR_CODES.UPLOAD_EMPTY,
      });
    }
    if (content.length > CITIZEN_UPLOAD_MAX_BYTES) {
      throw new PayloadTooLargeException({
        message: `Files may be at most ${String(CITIZEN_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`,
        code: CITIZEN_SELF_SERVICE_ERROR_CODES.UPLOAD_TOO_LARGE,
      });
    }

    // A retried upload of the same bytes to the same application returns the first upload.
    const sha256 = hashDocumentContent(content);
    const existing = await this.prisma.documentVersion.findFirst({
      where: {
        sha256,
        receivedFromIdentityId: identityId,
        associations: {
          some: {
            targetType: DocumentAssociationTargetType.APPLICATION,
            targetId: application.id,
          },
        },
      },
      include: { documentRecord: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return this.toDto(existing.documentRecord, existing, application.id, true);
    }

    const record = await this.records.create({
      title: dto.title,
      documentType: dto.documentType,
      sourceType: DocumentSourceType.APPLICANT_UPLOAD,
      owningInstitutionId: application.governmentService.responsibleInstitutionId,
    });
    const version = await this.versions.uploadVersion({
      documentRecordId: record.id,
      dto: {
        contentBase64: dto.contentBase64,
        originalFilename: dto.originalFilename,
        contentType: dto.contentType,
        privacyClassification: DocumentPrivacyClassification.PERSONAL_DATA,
      },
      content,
      actorIdentityId: identityId,
    });
    await this.associations.associate(
      {
        documentVersionId: version.id,
        targetType: DocumentAssociationTargetType.APPLICATION,
        targetId: application.id,
        associationRole: DocumentAssociationRole.SUPPORTING_EVIDENCE,
      },
      identityId,
    );

    // Quarantine may have updated the scan status after the version row was created.
    const stored = await this.prisma.documentVersion.findUniqueOrThrow({
      where: { id: version.id },
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId: session.sessionId,
      actorIdentityId: identityId,
      metadata: {
        action: 'CITIZEN_APPLICATION_DOCUMENT_UPLOADED',
        applicationId: application.id,
        caseId: application.case?.id ?? null,
        documentRecordId: record.id,
        documentVersionId: stored.id,
        sha256: stored.sha256,
        malwareScanStatus: stored.malwareScanStatus,
      },
    });

    return this.toDto(record, stored, application.id, false);
  }

  /**
   * Drafts accept uploads. After submission, uploads are accepted only while the case is
   * waiting for the applicant; withdrawn or closed applications never accept them.
   */
  private assertAcceptsUploads(
    applicationStatus: ApplicationStatus,
    caseStatus: CaseStatus | undefined,
  ): void {
    if (applicationStatus === ApplicationStatus.DRAFT) {
      return;
    }
    const submitted =
      applicationStatus === ApplicationStatus.SUBMITTED ||
      applicationStatus === ApplicationStatus.RECEIVED;
    if (
      submitted &&
      caseStatus !== undefined &&
      CITIZEN_UPLOAD_OPEN_CASE_STATUSES.includes(caseStatus)
    ) {
      return;
    }
    throw new ConflictException({
      message: 'This application is not accepting documents',
      code: CITIZEN_SELF_SERVICE_ERROR_CODES.APPLICATION_CLOSED_FOR_UPLOADS,
    });
  }

  private toDto(
    record: { id: string; documentNumber: string; title: string; documentType: string },
    version: {
      id: string;
      originalFilename: string;
      contentType: string;
      sizeBytes: number;
      sha256: string;
      malwareScanStatus: CitizenApplicationDocumentUploadDto['malwareScanStatus'];
      authenticityStatus: DocumentAuthenticityStatus;
    },
    applicationId: string,
    duplicate: boolean,
  ): CitizenApplicationDocumentUploadDto {
    return {
      documentId: record.id,
      documentNumber: record.documentNumber,
      documentVersionId: version.id,
      applicationId,
      title: record.title,
      documentType: record.documentType,
      originalFilename: version.originalFilename,
      contentType: version.contentType,
      sizeBytes: version.sizeBytes,
      sha256: version.sha256,
      malwareScanStatus: version.malwareScanStatus,
      authenticityStatus: version.authenticityStatus,
      duplicate,
      disclaimer: CITIZEN_DOCUMENT_UPLOAD_DISCLAIMER,
    };
  }
}
