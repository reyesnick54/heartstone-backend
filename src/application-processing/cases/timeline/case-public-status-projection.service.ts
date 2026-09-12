import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Case,
  type CaseEvent,
  CaseEventType,
  type CasePublicStatusProjection,
  CasePublicStatusStage,
  CaseStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  APPLICANT_STATUS_DISCLAIMER,
  PUBLIC_STATUS_STAGE_LABELS,
} from '../../application-processing-schema.constants';

@Injectable()
export class CasePublicStatusProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async deriveFromCase(
    caseRecord: Case,
    sourceEvent?: CaseEvent,
  ): Promise<CasePublicStatusProjection> {
    const stage = this.mapCaseStatusToPublicStage(caseRecord.caseStatus);
    const stageLabel = PUBLIC_STATUS_STAGE_LABELS[stage] ?? stage;
    const stageDetail = this.buildApplicantSafeDetail(caseRecord, stage);

    const existing = await this.prisma.casePublicStatusProjection.findUnique({
      where: { caseId: caseRecord.id },
    });

    if (existing) {
      return this.prisma.casePublicStatusProjection.update({
        where: { caseId: caseRecord.id },
        data: {
          publicStage: stage,
          publicStageLabel: stageLabel,
          publicStageDetail: stageDetail,
          sourceCaseStatus: caseRecord.caseStatus,
          sourceLegalStatus: caseRecord.legalStatus,
          applicantDisclaimer: APPLICANT_STATUS_DISCLAIMER,
          projectionVersion: existing.projectionVersion + 1,
          lastDerivedAt: new Date(),
          sourceEventId: sourceEvent?.id,
        },
      });
    }

    return this.prisma.casePublicStatusProjection.create({
      data: {
        caseId: caseRecord.id,
        publicStage: stage,
        publicStageLabel: stageLabel,
        publicStageDetail: stageDetail,
        sourceCaseStatus: caseRecord.caseStatus,
        sourceLegalStatus: caseRecord.legalStatus,
        applicantDisclaimer: APPLICANT_STATUS_DISCLAIMER,
        lastDerivedAt: new Date(),
        sourceEventId: sourceEvent?.id,
      },
    });
  }

  async deriveFromEvent(caseId: string, event: CaseEvent): Promise<CasePublicStatusProjection> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    const stage = this.mapEventToPublicStage(event.eventType, caseRecord.caseStatus);
    const stageLabel = PUBLIC_STATUS_STAGE_LABELS[stage] ?? stage;

    const existing = await this.prisma.casePublicStatusProjection.findUnique({
      where: { caseId },
    });

    const data = {
      publicStage: stage,
      publicStageLabel: stageLabel,
      publicStageDetail: this.buildApplicantSafeDetail(caseRecord, stage),
      sourceCaseStatus: caseRecord.caseStatus,
      sourceLegalStatus: caseRecord.legalStatus,
      applicantDisclaimer: APPLICANT_STATUS_DISCLAIMER,
      projectionVersion: (existing?.projectionVersion ?? 0) + 1,
      lastDerivedAt: new Date(),
      sourceEventId: event.id,
    };

    if (existing) {
      return this.prisma.casePublicStatusProjection.update({
        where: { caseId },
        data,
      });
    }

    return this.prisma.casePublicStatusProjection.create({
      data: { caseId, ...data },
    });
  }

  async getApplicantProjection(caseId: string): Promise<CasePublicStatusProjection> {
    const projection = await this.prisma.casePublicStatusProjection.findUnique({
      where: { caseId },
    });

    if (!projection) {
      const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
      if (!caseRecord) {
        throw new NotFoundException(`Case "${caseId}" was not found`);
      }
      return this.deriveFromCase(caseRecord);
    }

    return projection;
  }

  rejectClientOverride(): Promise<never> {
    return Promise.reject(new Error('Public status projection cannot be set by clients'));
  }

  mapCaseStatusToPublicStage(caseStatus: CaseStatus): CasePublicStatusStage {
    switch (caseStatus) {
      case CaseStatus.RECEIVED:
        return CasePublicStatusStage.RECEIVED;
      case CaseStatus.COMPLETENESS_REVIEW:
        return CasePublicStatusStage.CHECKING_SUBMISSION;
      case CaseStatus.SUBSTANTIVE_REVIEW:
      case CaseStatus.IN_PROGRESS:
      case CaseStatus.OPEN:
        return CasePublicStatusStage.UNDER_REVIEW;
      case CaseStatus.REFERRAL_PENDING:
        return CasePublicStatusStage.WAITING_ON_OTHER_AUTHORITY;
      case CaseStatus.PROFESSIONAL_REVIEW:
        return CasePublicStatusStage.PROFESSIONAL_REVIEW;
      case CaseStatus.INSPECTION:
        return CasePublicStatusStage.INSPECTION;
      case CaseStatus.DECISION_PENDING:
        return CasePublicStatusStage.DECISION_PENDING;
      case CaseStatus.SAFE_HALT:
        return CasePublicStatusStage.UNDER_REVIEW;
      case CaseStatus.WITHDRAWN:
        return CasePublicStatusStage.CLOSED;
      case CaseStatus.CLOSED:
      case CaseStatus.ARCHIVED:
        return CasePublicStatusStage.COMPLETED;
      default:
        return CasePublicStatusStage.UNDER_REVIEW;
    }
  }

  private mapEventToPublicStage(
    eventType: CaseEventType,
    fallbackStatus: CaseStatus,
  ): CasePublicStatusStage {
    switch (eventType) {
      case CaseEventType.APPLICATION_RECEIVED:
      case CaseEventType.CASE_OPENED:
        return CasePublicStatusStage.RECEIVED;
      case CaseEventType.COMPLETENESS_STARTED:
        return CasePublicStatusStage.CHECKING_SUBMISSION;
      case CaseEventType.DEFICIENCY_ISSUED:
        return CasePublicStatusStage.MORE_INFORMATION_NEEDED;
      case CaseEventType.REFERRED:
      case CaseEventType.REFERRAL_ACKNOWLEDGED:
      case CaseEventType.REFERRAL_RESPONSE_RECEIVED:
        return CasePublicStatusStage.WAITING_ON_OTHER_AUTHORITY;
      case CaseEventType.PROFESSIONAL_REVIEW_REQUESTED:
        return CasePublicStatusStage.PROFESSIONAL_REVIEW;
      case CaseEventType.INSPECTION_REQUESTED:
        return CasePublicStatusStage.INSPECTION;
      case CaseEventType.DECISION_PENDING:
        return CasePublicStatusStage.DECISION_PENDING;
      case CaseEventType.WITHDRAWN:
        return CasePublicStatusStage.CLOSED;
      case CaseEventType.CLOSED:
        return CasePublicStatusStage.COMPLETED;
      case CaseEventType.SAFE_HALT:
        return CasePublicStatusStage.UNDER_REVIEW;
      default:
        return this.mapCaseStatusToPublicStage(fallbackStatus);
    }
  }

  private buildApplicantSafeDetail(caseRecord: Case, stage: CasePublicStatusStage): string | null {
    if (stage === CasePublicStatusStage.DECISION_PENDING) {
      return 'Your application is awaiting a formal decision. No outcome has been recorded yet.';
    }

    if (caseRecord.caseStatus === CaseStatus.SAFE_HALT) {
      return 'Processing is temporarily paused. Further details are not available through this channel.';
    }

    return null;
  }
}
