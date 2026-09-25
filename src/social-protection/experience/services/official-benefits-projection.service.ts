import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  BenefitApplicationProfileStatus,
  BenefitAwardLifecycleStatus,
  BenefitEligibilityAssessmentStatus,
  BenefitSuspensionStatus,
  ExternalDeterminationStatus,
  FunctionAuthorityLifecycleStatus,
  SocialProtectionAppealReferenceStatus,
} from '@prisma/client';

import { AuthorityDependencyEvaluator } from '../../../authority/dependencies/authority-dependency-evaluator.service';
import { AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { SocialProtectionExperienceBoundaryService } from '../social-protection-experience-boundary.service';
import { BenefitScopeService } from './benefit-scope.service';

const BENEFIT_OFFICIAL_ACTIONS = [
  {
    actionKey: 'approve_benefit_award',
    label: 'Approve benefit award',
    authorityAction: 'DECIDE' as const,
    authorityCode: 'TEMPLATE-AUTH-BENEFIT-AWARD',
    isConsequential: true,
  },
  {
    actionKey: 'suspend_benefit_award',
    label: 'Suspend benefit award',
    authorityAction: 'ENFORCE' as const,
    authorityCode: 'TEMPLATE-AUTH-BENEFIT-SUSPEND',
    isConsequential: true,
  },
  {
    actionKey: 'terminate_benefit_award',
    label: 'Terminate benefit award',
    authorityAction: 'ENFORCE' as const,
    authorityCode: 'TEMPLATE-AUTH-BENEFIT-TERMINATE',
    isConsequential: true,
  },
  {
    actionKey: 'authorize_disbursement',
    label: 'Authorize benefit disbursement',
    authorityAction: 'APPROVE' as const,
    authorityCode: 'TEMPLATE-AUTH-BENEFIT-DISBURSE',
    isConsequential: true,
  },
  {
    actionKey: 'decide_benefit_appeal',
    label: 'Decide benefit appeal',
    authorityAction: 'DECIDE' as const,
    authorityCode: 'TEMPLATE-AUTH-BENEFIT-APPEAL-DECIDE',
    isConsequential: true,
  },
];

@Injectable()
export class OfficialBenefitsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: BenefitScopeService,
    private readonly boundary: SocialProtectionExperienceBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly dependencyEvaluator: AuthorityDependencyEvaluator,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return { queues: [], slaRiskCount: 0, disclaimer: this.boundary.rulesDisclaimer };
    }

    const applicantFilter = this.scope.buildApplicantJurisdictionFilter(
      context.institutionalContext.jurisdictionIds,
    );

    const [
      newApplications,
      eligibilityReview,
      evidenceDeficiencies,
      externalDeterminationRequests,
      awardReady,
      renewalReviews,
      cocReviews,
      suspensionTerminationReviews,
      paymentIssues,
      appeals,
      slaRisk,
    ] = await Promise.all([
      this.prisma.benefitApplicationProfile.count({
        where: { status: BenefitApplicationProfileStatus.LINKED, ...applicantFilter },
      }),
      this.prisma.benefitEligibilityAssessment.count({
        where: {
          status: BenefitEligibilityAssessmentStatus.PRELIMINARY,
          benefitApplicationProfile: applicantFilter,
        },
      }),
      this.prisma.benefitApplicationProfile.count({
        where: {
          status: BenefitApplicationProfileStatus.ACTIVE,
          eligibilityAssessments: { some: { requiresHumanDecision: true } },
          ...applicantFilter,
        },
      }),
      this.prisma.externalEligibilityDeterminationReference.count({
        where: { determinationStatus: ExternalDeterminationStatus.PENDING },
      }),
      this.prisma.benefitAward.count({
        where: {
          lifecycleStatus: BenefitAwardLifecycleStatus.PENDING_DECISION,
          benefitApplicationProfile: applicantFilter,
        },
      }),
      this.prisma.benefitRenewal.count({
        where: { benefitAward: { benefitApplicationProfile: applicantFilter } },
      }),
      this.prisma.householdIncomeDeclaration.count({
        where: { isVerifiedGovernmentFact: false },
      }),
      this.prisma.benefitSuspension.count({
        where: { status: BenefitSuspensionStatus.ACTIVE },
      }),
      this.prisma.benefitDisbursementReference.count({
        where: { paymentTransactionId: null },
      }),
      this.prisma.socialProtectionAppealReference.count({
        where: {
          status: {
            in: [
              SocialProtectionAppealReferenceStatus.LINKED,
              SocialProtectionAppealReferenceStatus.ACTIVE,
            ],
          },
        },
      }),
      this.prisma.benefitApplicationProfile.count({
        where: { status: BenefitApplicationProfileStatus.ACTIVE, ...applicantFilter },
      }),
    ]);

    return {
      departmentScopeLabel:
        context.scope.primaryAppointment?.departmentName ?? 'Social protection department scope',
      disclaimer: this.boundary.rulesDisclaimer,
      queues: [
        { queueKey: 'new_applications', label: 'New applications', count: newApplications },
        { queueKey: 'eligibility_review', label: 'Eligibility review', count: eligibilityReview },
        {
          queueKey: 'evidence_deficiencies',
          label: 'Evidence deficiencies',
          count: evidenceDeficiencies,
        },
        {
          queueKey: 'external_determination_requests',
          label: 'External determination requests',
          count: externalDeterminationRequests,
        },
        { queueKey: 'award_ready', label: 'Award-ready cases', count: awardReady },
        { queueKey: 'renewal_reviews', label: 'Renewal reviews', count: renewalReviews },
        {
          queueKey: 'change_of_circumstances_reviews',
          label: 'Change-of-circumstances reviews',
          count: cocReviews,
        },
        {
          queueKey: 'suspension_termination_reviews',
          label: 'Suspension/termination reviews',
          count: suspensionTerminationReviews,
        },
        { queueKey: 'payment_issues', label: 'Payment issues', count: paymentIssues },
        { queueKey: 'appeals', label: 'Appeals', count: appeals },
      ],
      slaRiskCount: slaRisk,
    };
  }

  async getAvailableActions(context: ResolvedOfficialContext, benefitAwardId: string) {
    const award = await this.prisma.benefitAward.findUnique({
      where: { id: benefitAwardId },
    });
    if (!award) {
      throw new NotFoundException('Benefit award not found');
    }

    const actions = [];
    for (const candidate of BENEFIT_OFFICIAL_ACTIONS) {
      if (!candidate.isConsequential) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: true,
          unavailableReason: null,
        });
        continue;
      }

      const authorityFunction = await this.prisma.functionAuthorityRecord.findFirst({
        where: { code: candidate.authorityCode },
      });

      if (!authorityFunction) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Benefit authority function is not configured',
        });
        continue;
      }

      if (authorityFunction.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Authority function is suspended',
        });
        continue;
      }

      const dependencies = await this.prisma.authorityDependency.findMany({
        where: { functionAuthorityRecordId: authorityFunction.id },
      });
      const dependencyFailures = await this.dependencyEvaluator.evaluate(
        authorityFunction.id,
        dependencies,
        { identityType: context.identityType },
      );
      if (this.dependencyEvaluator.hasBlockingFailures(dependencies, dependencyFailures)) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Unresolved dependency blocks action',
        });
        continue;
      }

      const evaluation = await this.authorityEvaluation.evaluate({
        identityId: context.identityId,
        functionAuthorityRecordId: authorityFunction.id,
        action: candidate.authorityAction,
        officeholderId: context.scope.primaryAppointment?.officeholderId,
        officeId: context.scope.primaryAppointment?.officeId,
        appointmentId: context.scope.primaryAppointment?.appointmentId,
        delegationId: context.scope.activeDelegations[0]?.delegationId,
      });

      actions.push({
        actionKey: candidate.actionKey,
        label: candidate.label,
        available: evaluation.outcome === AuthorityEvaluationOutcome.ALLOW,
        unavailableReason:
          evaluation.outcome === AuthorityEvaluationOutcome.ALLOW
            ? null
            : evaluation.summary || 'Authority evaluation denied',
      });
    }

    return { benefitAwardId, actions };
  }
}
