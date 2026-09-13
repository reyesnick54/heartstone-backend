import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  RecordCorrection,
  RecordCorrectionStatus,
  RecordIntegrityEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashRecordContent } from '../common/record-hash.util';
import { AI_ACTOR_IDENTITY_PREFIX } from '../evidence.constants';
import { RecordIntegrityService } from '../integrity/record-integrity.service';

export interface RequestRecordCorrectionInput {
  targetRecordType: string;
  targetRecordId: string;
  targetVersionId?: string;
  requestedBy: string;
  errorOrDisputeDescription: string;
  supportingEvidenceIds?: string[];
  correctionAuthorityFunctionId?: string;
  reassessmentRequired?: boolean;
  noticeRequired?: boolean;
  reason?: string;
}

export interface ApproveRecordCorrectionInput {
  correctionId: string;
  approvedByIdentityId: string;
  approvedByOfficeholderId?: string;
  authorityEvaluationRecordId: string;
  replacementRecordReference?: string;
  downstreamAffectedReferences?: string[];
}

export interface ImplementRecordCorrectionInput {
  correctionId: string;
  actorIdentityId: string;
  actorOfficeholderId?: string;
  correctedContentReference: string;
  correctedContent: Record<string, unknown>;
}

@Injectable()
export class RecordCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrityService: RecordIntegrityService,
  ) {}

  async requestCorrection(input: RequestRecordCorrectionInput): Promise<RecordCorrection> {
    if (input.requestedBy.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI assistants cannot request material record corrections');
    }

    await this.assertTargetExists(input.targetRecordType, input.targetRecordId, input.targetVersionId);

    const correction = await this.prisma.recordCorrection.create({
      data: {
        targetRecordType: input.targetRecordType,
        targetRecordId: input.targetRecordId,
        targetVersionId: input.targetVersionId,
        requestedBy: input.requestedBy,
        errorOrDisputeDescription: input.errorOrDisputeDescription,
        supportingEvidenceIds: input.supportingEvidenceIds ?? [],
        correctionAuthorityFunctionId: input.correctionAuthorityFunctionId,
        reassessmentRequired: input.reassessmentRequired ?? false,
        noticeRequired: input.noticeRequired ?? false,
        reason: input.reason,
        status: RecordCorrectionStatus.REQUESTED,
      },
    });

    await this.integrityService.append({
      recordType: 'RecordCorrection',
      recordId: correction.id,
      eventType: RecordIntegrityEventType.CREATED,
      content: {
        correctionId: correction.id,
        targetRecordType: correction.targetRecordType,
        targetRecordId: correction.targetRecordId,
        status: correction.status,
      },
      actorIdentityId: input.requestedBy,
      reason: 'Correction requested',
    });

    return correction;
  }

  async approveCorrection(input: ApproveRecordCorrectionInput): Promise<RecordCorrection> {
    const correction = await this.getCorrection(input.correctionId);

    if (
      correction.status !== RecordCorrectionStatus.REQUESTED &&
      correction.status !== RecordCorrectionStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Correction is not in an approvable state');
    }

    if (input.approvedByIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI assistants cannot approve material record corrections');
    }

    const evaluation = await this.prisma.authorityEvaluationRecord.findUnique({
      where: { id: input.authorityEvaluationRecordId },
    });

    if (evaluation?.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Correction approval requires a successful authority evaluation');
    }

    const updated = await this.prisma.recordCorrection.update({
      where: { id: correction.id },
      data: {
        status: RecordCorrectionStatus.APPROVED,
        approvedByIdentityId: input.approvedByIdentityId,
        approvedByOfficeholderId: input.approvedByOfficeholderId,
        approvedAt: new Date(),
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        replacementRecordReference: input.replacementRecordReference,
        downstreamAffectedReferences: input.downstreamAffectedReferences ?? [],
      },
    });

    await this.integrityService.append({
      recordType: 'RecordCorrection',
      recordId: updated.id,
      eventType: RecordIntegrityEventType.VERIFIED,
      content: {
        correctionId: updated.id,
        status: updated.status,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      },
      actorIdentityId: input.approvedByIdentityId,
      actorOfficeholderId: input.approvedByOfficeholderId,
      reason: 'Correction approved',
    });

    return updated;
  }

  async implementCorrection(input: ImplementRecordCorrectionInput): Promise<{
    correction: RecordCorrection;
    newVersionId: string;
  }> {
    const correction = await this.getCorrection(input.correctionId);

    if (correction.status !== RecordCorrectionStatus.APPROVED) {
      throw new ForbiddenException('Only approved corrections can be implemented');
    }

    if (input.actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI assistants cannot implement material record corrections');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newVersion = await this.createReplacementVersion(tx, correction, input);

      const updatedCorrection = await tx.recordCorrection.update({
        where: { id: correction.id },
        data: {
          status: RecordCorrectionStatus.IMPLEMENTED,
          replacementRecordReference: newVersion.id,
        },
      });

      return { correction: updatedCorrection, newVersionId: newVersion.id };
    });

    await this.integrityService.append({
      recordType: correction.targetRecordType,
      recordId: correction.targetRecordId,
      recordVersionId: result.newVersionId,
      eventType: RecordIntegrityEventType.CORRECTED,
      content: {
        correctionId: correction.id,
        originalVersionId: correction.targetVersionId,
        newVersionId: result.newVersionId,
        replacementReference: input.correctedContentReference,
      },
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
      reason: correction.reason ?? 'Correction implemented without erasure',
    });

    return result;
  }

  async rejectCorrection(correctionId: string, reason: string): Promise<RecordCorrection> {
    const correction = await this.getCorrection(correctionId);

    return this.prisma.recordCorrection.update({
      where: { id: correction.id },
      data: {
        status: RecordCorrectionStatus.REJECTED,
        reason,
      },
    });
  }

  async getOriginalRecord(correctionId: string) {
    const correction = await this.getCorrection(correctionId);
    return this.loadRecordVersion(
      correction.targetRecordType,
      correction.targetRecordId,
      correction.targetVersionId ?? undefined,
    );
  }

  private async getCorrection(correctionId: string): Promise<RecordCorrection> {
    const correction = await this.prisma.recordCorrection.findUnique({
      where: { id: correctionId },
    });

    if (!correction) {
      throw new NotFoundException(`Record correction "${correctionId}" was not found`);
    }

    return correction;
  }

  private async assertTargetExists(
    recordType: string,
    recordId: string,
    versionId?: string,
  ): Promise<void> {
    const record = await this.loadRecordVersion(recordType, recordId, versionId);
    if (!record) {
      throw new NotFoundException(`Target record "${recordType}/${recordId}" was not found`);
    }
  }

  private async loadRecordVersion(recordType: string, recordId: string, versionId?: string) {
    switch (recordType) {
      case 'DocumentVersion':
        return versionId
          ? this.prisma.documentVersion.findUnique({ where: { id: versionId } })
          : this.prisma.documentVersion.findFirst({
              where: { documentRecordId: recordId, supersededById: null },
              orderBy: { versionNumber: 'desc' },
            });
      case 'DocumentRecord':
        return this.prisma.documentRecord.findUnique({ where: { id: recordId } });
      case 'EvidenceRecord':
        return this.prisma.evidenceRecord.findUnique({ where: { id: recordId } });
      case 'EvidencePacketVersion':
        return versionId
          ? this.prisma.evidencePacketVersion.findUnique({ where: { id: versionId } })
          : this.prisma.evidencePacketVersion.findFirst({
              where: { packetId: recordId, supersededById: null },
              orderBy: { version: 'desc' },
            });
      case 'MasterAdministrativeFile':
        return this.prisma.masterAdministrativeFile.findUnique({ where: { id: recordId } });
      default:
        return null;
    }
  }

  private async createReplacementVersion(
    tx: Pick<PrismaService, 'documentVersion' | 'evidenceRecord' | 'recordCorrection'>,
    correction: RecordCorrection,
    input: ImplementRecordCorrectionInput,
  ) {
    if (
      correction.targetRecordType === 'DocumentVersion' ||
      correction.targetRecordType === 'DocumentRecord'
    ) {
      const documentRecordId =
        correction.targetRecordType === 'DocumentRecord'
          ? correction.targetRecordId
          : (
              await tx.documentVersion.findUniqueOrThrow({
                where: { id: correction.targetVersionId ?? '' },
              })
            ).documentRecordId;

      const latest = await tx.documentVersion.findFirst({
        where: { documentRecordId },
        orderBy: { versionNumber: 'desc' },
      });

      const originalVersion = correction.targetVersionId
        ? await tx.documentVersion.findUniqueOrThrow({
            where: { id: correction.targetVersionId },
          })
        : latest;

      if (!originalVersion) {
        throw new NotFoundException('Original document version not found');
      }

      const newVersion = await tx.documentVersion.create({
        data: {
          documentRecordId,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          originalFilename: originalVersion.originalFilename,
          contentType: originalVersion.contentType,
          sizeBytes: originalVersion.sizeBytes,
          storageProvider: originalVersion.storageProvider,
          storageObjectKey: input.correctedContentReference,
          storageVersionId: originalVersion.storageVersionId,
          sha256: hashRecordContent(input.correctedContent),
          dateCreated: originalVersion.dateCreated,
          dateReceived: new Date(),
          dateEffective: new Date(),
          language: originalVersion.language,
          signatureStatus: originalVersion.signatureStatus,
          sealStatus: originalVersion.sealStatus,
          authenticityStatus: originalVersion.authenticityStatus,
          securityClassification: originalVersion.securityClassification,
          privacyClassification: originalVersion.privacyClassification,
          confidentialityOrPrivilegeStatus: originalVersion.confidentialityOrPrivilegeStatus,
          malwareScanStatus: originalVersion.malwareScanStatus,
          receivedFromIdentityId: input.actorIdentityId,
        },
      });

      await tx.documentVersion.update({
        where: { id: originalVersion.id },
        data: { supersededById: newVersion.id },
      });

      return newVersion;
    }

    if (correction.targetRecordType === 'EvidenceRecord') {
      const original = await tx.evidenceRecord.findUniqueOrThrow({
        where: { id: correction.targetRecordId },
      });

      const replacement = await tx.evidenceRecord.create({
        data: {
          evidenceNumber: `${original.evidenceNumber}-CORR-${String(Date.now())}`,
          masterAdministrativeFileId: original.masterAdministrativeFileId,
          caseId: original.caseId,
          documentVersionId: original.documentVersionId,
          externalRecordReference: input.correctedContentReference,
          title: original.title,
          description: original.description,
          evidenceType: original.evidenceType,
          source: original.source,
          submittingParty: original.submittingParty,
          authorOrIssuingBody: original.authorOrIssuingBody,
          dateCreated: original.dateCreated,
          dateReceived: new Date(),
          periodCovered: original.periodCovered,
          status: original.status,
          validFrom: original.validFrom,
          validUntil: original.validUntil,
          confidentialityClassification: original.confidentialityClassification,
          integrityReference: hashRecordContent(input.correctedContent),
          limitations: original.limitations,
          retentionRuleReference: original.retentionRuleReference,
        },
      });

      await tx.evidenceRecord.update({
        where: { id: original.id },
        data: { supersededByEvidenceId: replacement.id },
      });

      return replacement;
    }

    throw new BadRequestException(
      `Correction implementation is not supported for record type "${correction.targetRecordType}"`,
    );
  }
}
