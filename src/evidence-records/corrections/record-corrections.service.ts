import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, Prisma, RecordCorrectionStatus } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { requireConsequentialAuthority } from '../common/consequential-authority.util';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { CORRECTION_REFERENCE_PREFIX } from '../evidence-records.constants';

@Injectable()
export class RecordCorrectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async requestCorrection(input: {
    targetRecordType: string;
    targetRecordId: string;
    actorIdentityId: string;
    reason: string;
    correctionPayload: Record<string, unknown>;
  }) {
    return this.prisma.recordCorrection.create({
      data: {
        correctionReference: generateEvidenceReferenceNumber(CORRECTION_REFERENCE_PREFIX),
        targetRecordType: input.targetRecordType,
        targetRecordId: input.targetRecordId,
        status: RecordCorrectionStatus.DRAFT,
        reason: input.reason,
        correctionPayload: input.correctionPayload as Prisma.InputJsonValue,
        requestedByIdentityId: input.actorIdentityId,
      },
    });
  }

  async approve(correctionId: string, approverIdentityId: string) {
    const correction = await this.prisma.recordCorrection.findUnique({
      where: { id: correctionId },
    });
    if (!correction) {
      throw new NotFoundException('Record correction not found');
    }

    return this.prisma.recordCorrection.update({
      where: { id: correctionId },
      data: {
        status: RecordCorrectionStatus.APPROVED,
        approvedByIdentityId: approverIdentityId,
      },
    });
  }

  async apply(
    correctionId: string,
    actorIdentityId: string,
    authority?: {
      functionAuthorityRecordId: string;
      officeholderId?: string;
      officeId?: string;
      appointmentId?: string;
      delegationId?: string;
    },
  ) {
    const correction = await this.prisma.recordCorrection.findUnique({
      where: { id: correctionId },
    });
    if (!correction) {
      throw new NotFoundException('Record correction not found');
    }

    this.boundary.assertCorrectionRequiresApproval(correction.status);

    if (authority) {
      await requireConsequentialAuthority(this.authorityEvaluation, {
        identityId: actorIdentityId,
        functionAuthorityRecordId: authority.functionAuthorityRecordId,
        action: AuthorityActionType.ADMINISTER,
        officeholderId: authority.officeholderId,
        officeId: authority.officeId,
        appointmentId: authority.appointmentId,
        delegationId: authority.delegationId,
      });
    }

    const applied = await this.prisma.recordCorrection.create({
      data: {
        correctionReference: generateEvidenceReferenceNumber(CORRECTION_REFERENCE_PREFIX),
        targetRecordType: correction.targetRecordType,
        targetRecordId: correction.targetRecordId,
        status: RecordCorrectionStatus.APPLIED,
        reason: `Applied correction superseding ${correction.correctionReference}`,
        correctionPayload: correction.correctionPayload as Prisma.InputJsonValue,
        requestedByIdentityId: actorIdentityId,
        approvedByIdentityId: correction.approvedByIdentityId,
        appliedAt: new Date(),
      },
    });

    await this.prisma.recordCorrection.update({
      where: { id: correctionId },
      data: { status: RecordCorrectionStatus.APPLIED },
    });

    return applied;
  }
}
