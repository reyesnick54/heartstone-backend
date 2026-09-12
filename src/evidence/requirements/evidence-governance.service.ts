import { Injectable } from '@nestjs/common';
import {
  EvidenceAcceptanceDecision,
  EvidenceAcceptancePurpose,
  EvidenceQualityAssessmentSource,
  EvidenceQualityCriterion,
  EvidenceQualityRating,
  EvidenceRecordStatus,
  EvidenceRequirementLinkStatus,
  EvidenceRequirementRelationship,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  EvidencePurposeAcceptanceForbiddenException,
  EvidenceRecordNotFoundException,
} from '../common/exceptions/evidence.exceptions';
import { EvidenceRecordsService } from '../records/evidence-records.service';
import {
  LinkEvidenceRequirementDto,
  ProposeEvidenceQualityAssessmentDto,
  RecordEvidencePurposeAcceptanceDto,
} from '../requirements/dto/evidence-governance.dto';

@Injectable()
export class EvidenceRequirementLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async linkRequirement(evidenceId: string, dto: LinkEvidenceRequirementDto) {
    const evidence = await this.prisma.evidenceRecord.findUnique({ where: { id: evidenceId } });
    if (!evidence) {
      throw new EvidenceRecordNotFoundException(evidenceId);
    }

    const checklistItem = await this.prisma.governmentServiceChecklistItem.findUnique({
      where: { id: dto.checklistItemId },
    });
    if (!checklistItem) {
      throw new EvidenceRecordNotFoundException(dto.checklistItemId);
    }

    return this.prisma.evidenceRequirementLink.create({
      data: {
        evidenceId,
        checklistItemId: dto.checklistItemId,
        relationship: dto.relationship,
        status: dto.status ?? EvidenceRequirementLinkStatus.LINKED,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
        limitations: dto.limitations,
      },
      include: { checklistItem: true },
    });
  }

  async updateRequirementLinkStatus(
    linkId: string,
    status: EvidenceRequirementLinkStatus,
    relationship?: EvidenceRequirementRelationship,
  ) {
    return this.prisma.evidenceRequirementLink.update({
      where: { id: linkId },
      data: {
        status,
        relationship,
      },
    });
  }
}

@Injectable()
export class EvidencePurposeAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evidenceRecords: EvidenceRecordsService,
  ) {}

  async recordAcceptance(
    evidenceId: string,
    reviewerIdentityId: string,
    dto: RecordEvidencePurposeAcceptanceDto,
    options?: { isAiActor?: boolean },
  ) {
    if (options?.isAiActor) {
      throw new EvidencePurposeAcceptanceForbiddenException(
        'AI assistance cannot finalize evidence purpose acceptance',
      );
    }

    await this.evidenceRecords.getById(evidenceId);

    const acceptance = await this.prisma.evidencePurposeAcceptance.create({
      data: {
        evidenceId,
        purpose: dto.purpose,
        decision: dto.decision,
        reviewerIdentityId,
        reviewerOfficeholderId: dto.reviewerOfficeholderId,
        decidedAt: new Date(dto.decidedAt),
        reason: dto.reason,
        scope: dto.scope,
        limitations: dto.limitations,
        isAiProposed: false,
        finalizedAt: new Date(),
      },
    });

    if (dto.purpose === EvidenceAcceptancePurpose.COMPLETENESS && dto.decision === 'ACCEPTED') {
      await this.prisma.evidenceRecord.update({
        where: { id: evidenceId },
        data: { status: EvidenceRecordStatus.ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE },
      });
    }

    if (dto.decision === EvidenceAcceptanceDecision.LIMITED) {
      await this.prisma.evidenceRecord.update({
        where: { id: evidenceId },
        data: { status: EvidenceRecordStatus.ACCEPTED_FOR_LIMITED_RELIANCE },
      });
    }

    if (dto.decision === EvidenceAcceptanceDecision.REJECTED) {
      await this.prisma.evidenceRecord.update({
        where: { id: evidenceId },
        data: { status: EvidenceRecordStatus.REJECTED_FOR_STATED_PURPOSE },
      });
    }

    return acceptance;
  }

  async hasAcceptanceForPurpose(evidenceId: string, purpose: EvidenceAcceptancePurpose) {
    return this.prisma.evidencePurposeAcceptance.findFirst({
      where: {
        evidenceId,
        purpose,
        decision: EvidenceAcceptanceDecision.ACCEPTED,
        finalizedAt: { not: null },
        isAiProposed: false,
      },
    });
  }
}

@Injectable()
export class EvidenceQualityAssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  async proposeAssessment(
    evidenceId: string,
    actorIdentityId: string,
    dto: ProposeEvidenceQualityAssessmentDto,
  ) {
    return this.prisma.evidenceQualityAssessment.create({
      data: {
        evidenceId,
        criterion: dto.criterion as EvidenceQualityCriterion,
        rating: dto.rating as EvidenceQualityRating,
        notes: dto.notes,
        assessedByIdentityId: actorIdentityId,
        assessedAt: new Date(dto.assessedAt),
        limitations: dto.limitations ?? 'AI-proposed quality assessment; not finalized.',
        assessmentSource: EvidenceQualityAssessmentSource.AI_PROPOSED,
        finalizedAt: null,
      },
    });
  }

  async finalizeAssessment(assessmentId: string, reviewerIdentityId: string) {
    const assessment = await this.prisma.evidenceQualityAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new EvidenceRecordNotFoundException(assessmentId);
    }

    if (assessment.assessmentSource !== EvidenceQualityAssessmentSource.AI_PROPOSED) {
      throw new EvidencePurposeAcceptanceForbiddenException(
        'Only AI-proposed assessments require explicit official finalization',
      );
    }

    return this.prisma.evidenceQualityAssessment.update({
      where: { id: assessmentId },
      data: {
        assessedByIdentityId: reviewerIdentityId,
        assessmentSource: EvidenceQualityAssessmentSource.OFFICIAL,
        finalizedAt: new Date(),
      },
    });
  }

  async recordOfficialAssessment(
    evidenceId: string,
    reviewerIdentityId: string,
    dto: ProposeEvidenceQualityAssessmentDto,
  ) {
    return this.prisma.evidenceQualityAssessment.create({
      data: {
        evidenceId,
        criterion: dto.criterion as EvidenceQualityCriterion,
        rating: dto.rating as EvidenceQualityRating,
        notes: dto.notes,
        assessedByIdentityId: reviewerIdentityId,
        assessedAt: new Date(dto.assessedAt),
        limitations: dto.limitations,
        assessmentSource: EvidenceQualityAssessmentSource.OFFICIAL,
        finalizedAt: new Date(),
      },
    });
  }
}
