import { Injectable, NotFoundException } from '@nestjs/common';
import { EvidencePacketVersionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashReviewRecordManifest } from '../common/review-record-hash.util';
import { REVIEW_RECORD_SNAPSHOT_NUMBER_PREFIX } from '../redress.constants';

export interface ReviewRecordReferenceManifest {
  applicationSubmissionIds: string[];
  caseId: string | null;
  requirementReferences: string[];
  correspondenceReferences: string[];
  deficiencyNoticeIds: string[];
  departmentalReviewIds: string[];
  governmentResponseReferences: string[];
  professionalReviewIds: string[];
  inspectionRecordIds: string[];
  recommendationReferences: string[];
  aiAssistanceReferences: string[];
  decisionReadinessAssessmentId: string | null;
  evidencePacketVersionId: string | null;
  governmentDecisionId: string;
  reasonsReferences: string[];
  officialInstrumentVersionIds: string[];
  decisionNoticeIds: string[];
  postDecisionEventReferences: string[];
}

@Injectable()
export class ReviewRecordSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async createSnapshot(challengedDecisionId: string) {
    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: challengedDecisionId },
      include: {
        case: {
          include: {
            application: { include: { submissions: true } },
            departmentalReviews: true,
            professionalReviews: true,
            inspectionRecords: true,
            decisionPreparationRecords: true,
          },
        },
        decisionReadinessAssessment: true,
        evidencePacketVersion: true,
        officialInstruments: { include: { versions: true } },
        conditions: true,
      },
    });

    if (!decision) {
      throw new NotFoundException(`GovernmentDecision "${challengedDecisionId}" was not found`);
    }

    const manifest: ReviewRecordReferenceManifest = {
      applicationSubmissionIds:
        decision.case?.application.submissions.map((submission) => submission.id) ?? [],
      caseId: decision.caseId,
      requirementReferences: [],
      correspondenceReferences: [],
      deficiencyNoticeIds: [],
      departmentalReviewIds: decision.case?.departmentalReviews.map((review) => review.id) ?? [],
      governmentResponseReferences: [],
      professionalReviewIds: decision.case?.professionalReviews.map((review) => review.id) ?? [],
      inspectionRecordIds: decision.case?.inspectionRecords.map((record) => record.id) ?? [],
      recommendationReferences:
        decision.case?.decisionPreparationRecords.map((record) => record.id) ?? [],
      aiAssistanceReferences:
        decision.case?.decisionPreparationRecords
          .filter((record) => Object.keys(record.aiAssistanceMetadata as object).length > 0)
          .map((record) => record.id) ?? [],
      decisionReadinessAssessmentId: decision.decisionReadinessAssessmentId,
      evidencePacketVersionId:
        decision.evidencePacketVersion?.status === EvidencePacketVersionStatus.FROZEN
          ? decision.evidencePacketVersionId
          : decision.evidencePacketVersionId,
      governmentDecisionId: decision.id,
      reasonsReferences: decision.reasonsReference ? [decision.reasonsReference] : [],
      officialInstrumentVersionIds: decision.officialInstruments.flatMap((instrument) =>
        instrument.versions.map((version) => version.id),
      ),
      decisionNoticeIds: [],
      postDecisionEventReferences: [],
    };

    const snapshotHash = hashReviewRecordManifest(manifest as unknown as Record<string, unknown>);
    const snapshotNumber = await this.generateSnapshotNumber();

    return this.prisma.reviewRecordSnapshot.create({
      data: {
        snapshotNumber,
        challengedDecisionId,
        snapshotHash,
        referenceManifest: manifest as unknown as Prisma.InputJsonValue,
        immutable: true,
      },
    });
  }

  private async generateSnapshotNumber(): Promise<string> {
    const count = await this.prisma.reviewRecordSnapshot.count();
    return `${REVIEW_RECORD_SNAPSHOT_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
