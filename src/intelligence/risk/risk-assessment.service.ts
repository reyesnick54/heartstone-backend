import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  RiskAssessmentStatus,
  RiskDefinitionStatus,
  RiskEvidenceBasis,
  RiskMitigationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { RISK_ASSESSMENT_NUMBER_PREFIX, RISK_SCORE_DISCLAIMER } from '../intelligence.constants';

export interface CreateRiskDefinitionInput {
  code: string;
  name: string;
  description?: string;
  methodology: string;
  methodologyVersion: string;
  institutionId?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface CreateRiskAssessmentInput {
  definitionId: string;
  subjectType: string;
  subjectReference: string;
  methodologyVersion: string;
  limitations: string;
  overallScore?: number;
  scoreLabel?: string;
  claimsAuthority?: boolean;
  scoreIsMandatoryGateBypass?: boolean;
  mandatoryGatePresent?: boolean;
}

export interface AddRiskFactorInput {
  assessmentId: string;
  factorLabel: string;
  basis: RiskEvidenceBasis;
  score?: number;
  weight?: number;
  exactValue?: Prisma.InputJsonValue;
  basisLabel?: string;
}

export interface AddRiskMitigationInput {
  assessmentId: string;
  mitigationText: string;
}

export interface RecordRiskReviewInput {
  assessmentId: string;
  reviewerIdentityId: string;
  reviewNotes?: string;
}

@Injectable()
export class RiskAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async createDefinition(input: CreateRiskDefinitionInput) {
    if (!input.methodologyVersion.trim()) {
      throw new BadRequestException('Risk methodology must be versioned');
    }

    return this.prisma.riskDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        methodology: input.methodology,
        methodologyVersion: input.methodologyVersion,
        institutionId: input.institutionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        status: RiskDefinitionStatus.DRAFT,
      },
    });
  }

  async activateDefinition(definitionId: string) {
    return this.prisma.riskDefinition.update({
      where: { id: definitionId },
      data: { status: RiskDefinitionStatus.ACTIVE },
    });
  }

  async createAssessment(input: CreateRiskAssessmentInput) {
    const definition = await this.prisma.riskDefinition.findUnique({
      where: { id: input.definitionId },
    });
    if (definition?.status !== RiskDefinitionStatus.ACTIVE) {
      throw new BadRequestException('Risk definition must be active');
    }

    this.boundary.assertRiskScoreNotAuthority({ claimsAuthority: input.claimsAuthority });
    this.boundary.assertRiskScoreCannotBypassGate({
      scoreIsMandatoryGateBypass: input.scoreIsMandatoryGateBypass,
    });

    const count = await this.prisma.riskAssessment.count();
    const assessmentNumber = `${RISK_ASSESSMENT_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const scoreLabel =
      input.overallScore !== undefined
        ? `${RISK_SCORE_DISCLAIMER} ${input.scoreLabel ?? 'Prioritization score only'}`
        : input.scoreLabel;

    return this.prisma.riskAssessment.create({
      data: {
        assessmentNumber,
        definitionId: input.definitionId,
        subjectType: input.subjectType,
        subjectReference: input.subjectReference,
        methodologyVersion: input.methodologyVersion,
        limitations: input.limitations,
        overallScore: input.overallScore,
        scoreLabel,
        scoreIsMandatoryGateBypass: false,
        status: RiskAssessmentStatus.DRAFT,
      },
    });
  }

  async addFactor(input: AddRiskFactorInput) {
    this.boundary.assertModelEstimateLabeled(input.basis, input.basisLabel);

    const basisLabel =
      input.basis === RiskEvidenceBasis.MODEL_ESTIMATE
        ? (input.basisLabel ?? 'MODEL_ESTIMATE')
        : input.basisLabel;

    return this.prisma.riskFactor.create({
      data: {
        assessmentId: input.assessmentId,
        factorLabel: input.factorLabel,
        basis: input.basis,
        score: input.score,
        weight: input.weight,
        exactValue: input.exactValue,
        basisLabel,
      },
    });
  }

  async addMitigation(input: AddRiskMitigationInput) {
    return this.prisma.riskMitigation.create({
      data: {
        assessmentId: input.assessmentId,
        mitigationText: input.mitigationText,
        status: RiskMitigationStatus.PROPOSED,
      },
    });
  }

  async recordReview(input: RecordRiskReviewInput) {
    this.boundary.assertHumanReviewerPresent(input.reviewerIdentityId);

    const review = await this.prisma.riskReview.create({
      data: {
        assessmentId: input.assessmentId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewNotes: input.reviewNotes,
      },
    });

    await this.prisma.riskAssessment.update({
      where: { id: input.assessmentId },
      data: { status: RiskAssessmentStatus.UNDER_REVIEW },
    });

    return review;
  }

  async activateAssessment(assessmentId: string) {
    const assessment = await this.prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
      include: { reviews: true, factors: true },
    });
    if (!assessment) {
      throw new BadRequestException('Risk assessment not found');
    }

    if (assessment.scoreIsMandatoryGateBypass) {
      throw new BadRequestException('Risk assessment cannot bypass mandatory gates');
    }

    for (const factor of assessment.factors) {
      this.boundary.assertModelEstimateLabeled(factor.basis, factor.basisLabel ?? undefined);
    }

    return this.prisma.riskAssessment.update({
      where: { id: assessmentId },
      data: {
        status: RiskAssessmentStatus.ACTIVE,
        assessedAt: new Date(),
      },
    });
  }
}
