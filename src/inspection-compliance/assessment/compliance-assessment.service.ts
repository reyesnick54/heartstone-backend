import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceAssessmentStatus,
  ComplianceRecommendedNextStep,
  DecisionConditionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { buildComplianceNumber } from '../common/compliance-number.util';
import {
  AI_ALERT_NOT_VIOLATION_MESSAGE,
  COMPLIANCE_ASSESSMENT_NUMBER_PREFIX,
  OVERDUE_OBLIGATION_NOT_VIOLATION_MESSAGE,
  RISK_SCORE_NOT_VIOLATION_MESSAGE,
} from '../inspection-compliance.constants';

export interface CreateComplianceAssessmentInput {
  caseId: string;
  assessmentStandard: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId?: string;
  functionAuthorityRecordId?: string;
  evidencePacketId?: string;
  obligationsReviewed?: string[];
  submissionsReviewed?: string[];
  verifiedEvidenceReviewed?: string[];
  inspectionFindingsReviewed?: string[];
  correctiveActionHistoryReviewed?: string[];
  incidentsReviewed?: string[];
  professionalFindingsReviewed?: string[];
  governmentInputsReviewed?: string[];
  instrumentStatusReviewed?: string[];
  priorComplianceHistoryReviewed?: string[];
}

export interface CompleteComplianceAssessmentInput {
  assessmentId: string;
  findings?: string;
  uncertainties?: string;
  recommendedNextStep?: ComplianceRecommendedNextStep;
}

export interface AiRiskFlagInput {
  assessmentId: string;
  flagType: string;
  description: string;
  relatedReference?: string;
}

@Injectable()
export class ComplianceAssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateComplianceAssessmentInput) {
    await this.assertCaseExists(input.caseId);
    const sequence = await this.prisma.complianceAssessment.count();
    const assessmentNumber = buildComplianceNumber(
      COMPLIANCE_ASSESSMENT_NUMBER_PREFIX,
      sequence + 1,
    );

    return this.prisma.complianceAssessment.create({
      data: {
        assessmentNumber,
        caseId: input.caseId,
        assessmentStandard: input.assessmentStandard,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        evidencePacketId: input.evidencePacketId,
        obligationsReviewed: input.obligationsReviewed ?? [],
        submissionsReviewed: input.submissionsReviewed ?? [],
        verifiedEvidenceReviewed: input.verifiedEvidenceReviewed ?? [],
        inspectionFindingsReviewed: input.inspectionFindingsReviewed ?? [],
        correctiveActionHistoryReviewed: input.correctiveActionHistoryReviewed ?? [],
        incidentsReviewed: input.incidentsReviewed ?? [],
        professionalFindingsReviewed: input.professionalFindingsReviewed ?? [],
        governmentInputsReviewed: input.governmentInputsReviewed ?? [],
        instrumentStatusReviewed: input.instrumentStatusReviewed ?? [],
        priorComplianceHistoryReviewed: input.priorComplianceHistoryReviewed ?? [],
        status: ComplianceAssessmentStatus.DRAFT,
      },
    });
  }

  async complete(input: CompleteComplianceAssessmentInput) {
    const assessment = await this.prisma.complianceAssessment.findUnique({
      where: { id: input.assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException('Compliance assessment not found');
    }

    return this.prisma.complianceAssessment.update({
      where: { id: input.assessmentId },
      data: {
        findings: input.findings,
        uncertainties: input.uncertainties,
        recommendedNextStep: input.recommendedNextStep,
        status: ComplianceAssessmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async recordAiRiskFlag(input: AiRiskFlagInput) {
    const assessment = await this.prisma.complianceAssessment.findUnique({
      where: { id: input.assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException('Compliance assessment not found');
    }

    const existingFlags = Array.isArray(assessment.aiRiskFlags)
      ? (assessment.aiRiskFlags as object[])
      : [];
    const newFlag = {
      flagType: input.flagType,
      description: input.description,
      relatedReference: input.relatedReference,
      recordedAt: new Date().toISOString(),
      isViolation: false,
    };

    return this.prisma.complianceAssessment.update({
      where: { id: input.assessmentId },
      data: {
        aiRiskFlags: [...existingFlags, newFlag],
      },
    });
  }

  async reviewOverdueObligations(caseId: string): Promise<{
    overdueObligationIds: string[];
    createsViolation: false;
    message: string;
  }> {
    const decisions = await this.prisma.governmentDecision.findMany({
      where: { caseId },
      include: { conditions: true },
    });

    const overdueIds: string[] = [];
    const now = new Date();
    for (const decision of decisions) {
      for (const condition of decision.conditions) {
        if (
          condition.status === DecisionConditionStatus.OVERDUE ||
          (condition.dueAt && condition.dueAt < now && condition.status !== DecisionConditionStatus.SATISFIED)
        ) {
          overdueIds.push(condition.id);
        }
      }
    }

    return {
      overdueObligationIds: overdueIds,
      createsViolation: false,
      message: OVERDUE_OBLIGATION_NOT_VIOLATION_MESSAGE,
    };
  }

  signalIsViolation(signalType: 'overdue_obligation' | 'risk_score' | 'ai_alert'): boolean {
    if (signalType === 'overdue_obligation') {
      return false;
    }
    if (signalType === 'risk_score') {
      return false;
    }
    return false;
  }

  complianceSignalMessage(signalType: 'overdue_obligation' | 'risk_score' | 'ai_alert'): string {
    switch (signalType) {
      case 'overdue_obligation':
        return OVERDUE_OBLIGATION_NOT_VIOLATION_MESSAGE;
      case 'risk_score':
        return RISK_SCORE_NOT_VIOLATION_MESSAGE;
      case 'ai_alert':
        return AI_ALERT_NOT_VIOLATION_MESSAGE;
    }
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
