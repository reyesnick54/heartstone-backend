import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  OfficialInstrumentStatus,
  ProtectiveActionRecommendationStatus,
  ProtectiveActionRecommendationType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { assertComplianceAuthority } from '../common/compliance-authority.guard';
import { buildComplianceNumber } from '../common/compliance-number.util';
import {
  PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE,
  PROTECTIVE_ACTION_NUMBER_PREFIX,
  PROTECTIVE_RECOMMENDATION_NO_INSTRUMENT_CHANGE_MESSAGE,
} from '../inspection-compliance.constants';

export interface CreateProtectiveActionRecommendationInput {
  caseId: string;
  complianceAssessmentId?: string;
  noncomplianceFindingId?: string;
  recommendationType: ProtectiveActionRecommendationType;
  rationale: string;
  recommendedByIdentityId: string;
  recommendedByOfficeholderId?: string;
  functionAuthorityRecordId: string;
  phase8InstrumentId?: string;
}

@Injectable()
export class ProtectiveActionRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async create(input: CreateProtectiveActionRecommendationInput) {
    await this.assertCaseExists(input.caseId);

    if (
      input.recommendationType === ProtectiveActionRecommendationType.SUSPENSION_REVIEW ||
      input.recommendationType === ProtectiveActionRecommendationType.REVOCATION_REVIEW
    ) {
      this.assertPhase8ReviewRecommendation(input.recommendationType);
    }

    const authorityEvaluationRecordId = await assertComplianceAuthority(
      this.authorityEvaluation,
      {
        identityId: input.recommendedByIdentityId,
        officeholderId: input.recommendedByOfficeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        action: AuthorityActionType.RECOMMEND,
      },
    );

    const sequence = await this.prisma.protectiveActionRecommendation.count();
    const recommendationNumber = buildComplianceNumber(PROTECTIVE_ACTION_NUMBER_PREFIX, sequence + 1);

    return this.prisma.protectiveActionRecommendation.create({
      data: {
        recommendationNumber,
        caseId: input.caseId,
        complianceAssessmentId: input.complianceAssessmentId,
        noncomplianceFindingId: input.noncomplianceFindingId,
        recommendationType: input.recommendationType,
        status: ProtectiveActionRecommendationStatus.SUBMITTED,
        rationale: input.rationale,
        recommendedByIdentityId: input.recommendedByIdentityId,
        recommendedByOfficeholderId: input.recommendedByOfficeholderId,
        authorityEvaluationRecordId,
        phase8InstrumentId: input.phase8InstrumentId,
      },
    });
  }

  assertPhase8ReviewRecommendation(type: ProtectiveActionRecommendationType): void {
    if (
      type !== ProtectiveActionRecommendationType.SUSPENSION_REVIEW &&
      type !== ProtectiveActionRecommendationType.REVOCATION_REVIEW
    ) {
      return;
    }
  }

  async attemptInstrumentStatusChange(
    instrumentId: string,
    targetStatus: OfficialInstrumentStatus,
  ): Promise<never> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: instrumentId },
    });
    if (!instrument) {
      throw new NotFoundException('Official instrument not found');
    }

    throw new BadRequestException(
      `${PROTECTIVE_RECOMMENDATION_NO_INSTRUMENT_CHANGE_MESSAGE}. ${PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE}. Cannot change instrument status to ${targetStatus} from a protective recommendation.`,
    );
  }

  recommendationChangesInstrumentStatus(): boolean {
    return false;
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
