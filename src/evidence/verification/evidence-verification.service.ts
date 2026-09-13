import { Injectable } from '@nestjs/common';
import {
  EvidenceRecordStatus,
  EvidenceVerificationCategory,
  EvidenceVerificationMethod,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  EvidenceVerificationForbiddenException,
  UnknownVerificationMethodException,
} from '../common/exceptions/evidence.exceptions';
import {
  CONTROLLED_VERIFICATION_METHODS,
  FORBIDDEN_AI_FINALIZATION_CATEGORIES,
} from '../evidence.constants';
import { EvidenceRecordsService } from '../records/evidence-records.service';
import { RecordEvidenceVerificationDto } from './dto/record-evidence-verification.dto';

@Injectable()
export class EvidenceVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evidenceRecords: EvidenceRecordsService,
  ) {}

  async recordVerification(
    evidenceId: string,
    verifierIdentityId: string,
    dto: RecordEvidenceVerificationDto,
    options?: { isAiActor?: boolean },
  ) {
    if (dto.verificationMethod === EvidenceVerificationMethod.UNKNOWN) {
      throw new UnknownVerificationMethodException(dto.verificationMethod);
    }

    if (!CONTROLLED_VERIFICATION_METHODS.includes(dto.verificationMethod)) {
      throw new UnknownVerificationMethodException(dto.verificationMethod);
    }

    const isAiActor = options?.isAiActor === true || dto.isAiProposed === true;
    const isConsequentialCategory = this.isConsequentialCategory(dto.category);

    if (isAiActor && isConsequentialCategory) {
      return this.createAiProposal(evidenceId, verifierIdentityId, dto);
    }

    if (isAiActor) {
      throw new EvidenceVerificationForbiddenException(
        'AI actors may propose verification but cannot finalize official verification records',
      );
    }

    const evidence = await this.evidenceRecords.getById(evidenceId);

    const verification = await this.prisma.evidenceVerification.create({
      data: {
        evidenceId,
        category: dto.category,
        whatWasVerified: dto.whatWasVerified,
        verificationMethod: dto.verificationMethod,
        verificationSource: dto.verificationSource,
        result: dto.result,
        verifiedByIdentityId: verifierIdentityId,
        verifiedByOfficeholderId: dto.verifiedByOfficeholderId,
        professionalReference: dto.professionalReference,
        externalAuthorityReference: dto.externalAuthorityReference,
        performedAt: new Date(dto.performedAt),
        limitations: dto.limitations,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        authorityEvaluationRecordId: dto.authorityEvaluationRecordId,
        isAiProposed: false,
        finalizedAt: new Date(),
      },
    });

    const nextStatus = this.deriveStatusFromVerification(evidence.status, dto.category, dto.result);

    await this.prisma.evidenceRecord.update({
      where: { id: evidenceId },
      data: { status: nextStatus },
    });

    return verification;
  }

  private async createAiProposal(
    evidenceId: string,
    actorIdentityId: string,
    dto: RecordEvidenceVerificationDto,
  ) {
    return this.prisma.evidenceVerification.create({
      data: {
        evidenceId,
        category: dto.category,
        whatWasVerified: dto.whatWasVerified,
        verificationMethod: dto.verificationMethod,
        verificationSource: dto.verificationSource,
        result: dto.result,
        verifiedByIdentityId: actorIdentityId,
        performedAt: new Date(dto.performedAt),
        limitations: dto.limitations ?? 'AI-proposed verification; not finalized.',
        isAiProposed: true,
        finalizedAt: null,
      },
    });
  }

  private isConsequentialCategory(category: EvidenceVerificationCategory): boolean {
    return FORBIDDEN_AI_FINALIZATION_CATEGORIES.includes(
      category as (typeof FORBIDDEN_AI_FINALIZATION_CATEGORIES)[number],
    );
  }

  private deriveStatusFromVerification(
    currentStatus: EvidenceRecordStatus,
    category: EvidenceVerificationCategory,
    result: RecordEvidenceVerificationDto['result'],
  ): EvidenceRecordStatus {
    if (
      currentStatus === EvidenceRecordStatus.WITHDRAWN ||
      currentStatus === EvidenceRecordStatus.SUPERSEDED
    ) {
      return currentStatus;
    }

    if (category === EvidenceVerificationCategory.INTEGRITY && result === 'CONFIRMED') {
      return currentStatus === EvidenceRecordStatus.VERIFIED
        ? EvidenceRecordStatus.VERIFIED
        : EvidenceRecordStatus.PENDING_VERIFICATION;
    }

    if (result === 'CONFIRMED') {
      return EvidenceRecordStatus.VERIFIED;
    }

    if (result === 'NOT_CONFIRMED') {
      return EvidenceRecordStatus.PARTIALLY_VERIFIED;
    }

    return EvidenceRecordStatus.PENDING_VERIFICATION;
  }

  hasIntegrityVerificationOnly(evidenceId: string) {
    return this.prisma.evidenceVerification.findFirst({
      where: {
        evidenceId,
        category: EvidenceVerificationCategory.INTEGRITY,
        isAiProposed: false,
        finalizedAt: { not: null },
      },
    });
  }

  hasContentFactVerification(evidenceId: string) {
    return this.prisma.evidenceVerification.findFirst({
      where: {
        evidenceId,
        category: EvidenceVerificationCategory.CONTENT_FACT,
        isAiProposed: false,
        finalizedAt: { not: null },
      },
    });
  }
}
