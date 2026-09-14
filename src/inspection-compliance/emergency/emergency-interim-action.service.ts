import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  EmergencyInterimActionStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { assertComplianceAuthority } from '../common/compliance-authority.guard';
import { buildComplianceNumber } from '../common/compliance-number.util';
import {
  EMERGENCY_INTERIM_ACTION_NUMBER_PREFIX,
  EMERGENCY_INTERIM_NOT_FINAL_MESSAGE,
  EMERGENCY_REVIEW_REQUIRED_MESSAGE,
  PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE,
} from '../inspection-compliance.constants';

export interface RecordEmergencyInterimActionInput {
  caseId: string;
  functionAuthorityRecordId: string;
  immediateRisk: string;
  scope: string;
  evidenceAvailable: string;
  actorIdentityId: string;
  actorOfficeholderId?: string;
  effectiveFrom: Date;
  effectiveUntil: Date;
  noticeRequirement?: string;
  postActionReviewDeadline: Date;
  relationshipToFinalDecision?: string;
}

export interface CompletePostActionReviewInput {
  recordId: string;
  reviewedByIdentityId: string;
  reviewedByOfficeholderId?: string;
  functionAuthorityRecordId: string;
}

@Injectable()
export class EmergencyInterimActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async record(input: RecordEmergencyInterimActionInput) {
    await this.assertCaseExists(input.caseId);
    this.assertTimeLimited(input.effectiveFrom, input.effectiveUntil, input.postActionReviewDeadline);

    const authorityEvaluationRecordId = await assertComplianceAuthority(
      this.authorityEvaluation,
      {
        identityId: input.actorIdentityId,
        officeholderId: input.actorOfficeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        action: AuthorityActionType.ENFORCE,
      },
    );

    const sequence = await this.prisma.emergencyInterimActionRecord.count();
    const recordNumber = buildComplianceNumber(EMERGENCY_INTERIM_ACTION_NUMBER_PREFIX, sequence + 1);

    return this.prisma.emergencyInterimActionRecord.create({
      data: {
        recordNumber,
        caseId: input.caseId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        immediateRisk: input.immediateRisk,
        scope: input.scope,
        evidenceAvailable: input.evidenceAvailable,
        actorIdentityId: input.actorIdentityId,
        actorOfficeholderId: input.actorOfficeholderId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        noticeRequirement: input.noticeRequirement,
        postActionReviewDeadline: input.postActionReviewDeadline,
        relationshipToFinalDecision: input.relationshipToFinalDecision,
        status: EmergencyInterimActionStatus.ACTIVE,
        authorityEvaluationRecordId,
      },
    });
  }

  async completePostActionReview(input: CompletePostActionReviewInput) {
    const record = await this.prisma.emergencyInterimActionRecord.findUnique({
      where: { id: input.recordId },
    });
    if (!record) {
      throw new NotFoundException('Emergency interim action record not found');
    }

    await assertComplianceAuthority(this.authorityEvaluation, {
      identityId: input.reviewedByIdentityId,
      officeholderId: input.reviewedByOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
    });

    return this.prisma.emergencyInterimActionRecord.update({
      where: { id: input.recordId },
      data: {
        status: EmergencyInterimActionStatus.REVIEWED,
        postActionReviewCompletedAt: new Date(),
      },
    });
  }

  async expireOverdueRecords(at: Date = new Date()): Promise<number> {
    const result = await this.prisma.emergencyInterimActionRecord.updateMany({
      where: {
        status: EmergencyInterimActionStatus.ACTIVE,
        effectiveUntil: { lt: at },
      },
      data: {
        status: EmergencyInterimActionStatus.EXPIRED,
      },
    });
    return result.count;
  }

  assertTimeLimited(effectiveFrom: Date, effectiveUntil: Date, reviewDeadline: Date): void {
    if (effectiveUntil <= effectiveFrom) {
      throw new BadRequestException('Emergency interim action must have a positive duration');
    }
    if (reviewDeadline < effectiveUntil) {
      throw new BadRequestException(EMERGENCY_REVIEW_REQUIRED_MESSAGE);
    }
  }

  isFinalDetermination(): boolean {
    return false;
  }

  interimActionBoundaryMessage(): string {
    return `${EMERGENCY_INTERIM_NOT_FINAL_MESSAGE}. ${EMERGENCY_REVIEW_REQUIRED_MESSAGE}`;
  }

  attemptInstrumentChangeViaEmergency(
    instrumentId: string,
    targetStatus: OfficialInstrumentStatus,
  ): never {
    throw new BadRequestException(
      `${EMERGENCY_INTERIM_NOT_FINAL_MESSAGE}. ${PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE}. Cannot change instrument ${instrumentId} to ${targetStatus} via emergency interim action.`,
    );
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
