import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  EmployerRegistryStatus,
  EmploymentComplaintStatus,
  EmploymentDisputeStatus,
  ExternalDeterminationStatus,
  FunctionAuthorityLifecycleStatus,
  WorkPermitApplicationProfileStatus,
  WorkPermitLifecycleStatus,
} from '@prisma/client';

import { AuthorityDependencyEvaluator } from '../../../authority/dependencies/authority-dependency-evaluator.service';
import { AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { LabourExperienceBoundaryService } from '../labour-experience-boundary.service';
import { LabourScopeService } from './labour-scope.service';

const LABOUR_OFFICIAL_ACTIONS = [
  {
    actionKey: 'approve_work_permit',
    label: 'Approve work permit',
    authorityAction: 'DECIDE' as const,
    isConsequential: true,
  },
  {
    actionKey: 'suspend_work_permit',
    label: 'Suspend work permit',
    authorityAction: 'ENFORCE' as const,
    isConsequential: true,
  },
  {
    actionKey: 'revoke_work_permit',
    label: 'Revoke work permit',
    authorityAction: 'ENFORCE' as const,
    isConsequential: true,
  },
  {
    actionKey: 'decide_complaint',
    label: 'Decide complaint where legally applicable',
    authorityAction: 'DECIDE' as const,
    isConsequential: true,
  },
];

@Injectable()
export class OfficialLabourProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: LabourScopeService,
    private readonly boundary: LabourExperienceBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly dependencyEvaluator: AuthorityDependencyEvaluator,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return { queues: [], slaRiskCount: 0, disclaimer: this.boundary.rulesDisclaimer };
    }

    const jurisdictionFilter = this.scope.buildOfficialJurisdictionFilter(
      context.institutionalContext.jurisdictionIds,
    );
    const workerFilter = this.scope.buildWorkerJurisdictionFilter(
      context.institutionalContext.jurisdictionIds,
    );
    const [
      employerRegistrationQueue,
      workPermitQueue,
      labourMarketQueue,
      qualificationQueue,
      workforceDeclarationReview,
      inspectionQueue,
      correctiveActionQueue,
      complaintQueue,
      disputeQueue,
      renewals,
      permitExpirations,
      slaRisk,
    ] = await Promise.all([
      this.prisma.employerRegistryRecord.count({
        where: { registrationStatus: EmployerRegistryStatus.DRAFT, ...jurisdictionFilter },
      }),
      this.prisma.workPermitApplicationProfile.count({
        where: {
          status: WorkPermitApplicationProfileStatus.LINKED,
          ...workerFilter,
        },
      }),
      this.prisma.labourExternalDependency.count({
        where: {
          determinationStatus: ExternalDeterminationStatus.PENDING,
          ...workerFilter,
        },
      }),
      this.prisma.professionalQualificationReference.count({
        where: { validatedAt: null, workerProfileReference: jurisdictionFilter },
      }),
      this.prisma.employerWorkforceDeclaration.count({
        where: {
          declaredAt: { not: null },
          isVerifiedGovernmentFact: false,
          employerRegistryRecord: jurisdictionFilter,
        },
      }),
      this.prisma.labourInspectionReference.count({
        where: {
          isFinalEnforcementDecision: false,
          employerRegistryRecord: jurisdictionFilter,
        },
      }),
      this.prisma.labourComplianceMatterReference.count({
        where: { employerRegistryRecord: jurisdictionFilter },
      }),
      this.prisma.employmentComplaint.count({
        where: {
          status: { in: [EmploymentComplaintStatus.FILED, EmploymentComplaintStatus.UNDER_REVIEW] },
          ...workerFilter,
        },
      }),
      this.prisma.employmentDispute.count({
        where: {
          status: { in: [EmploymentDisputeStatus.OPEN, EmploymentDisputeStatus.MEDIATION] },
          ...workerFilter,
        },
      }),
      this.prisma.workPermitRecord.count({
        where: { lifecycleStatus: WorkPermitLifecycleStatus.PENDING_ISSUANCE, ...workerFilter },
      }),
      this.prisma.workPermitRecord.count({
        where: {
          lifecycleStatus: {
            in: [WorkPermitLifecycleStatus.ISSUED, WorkPermitLifecycleStatus.EFFECTIVE],
          },
          validUntil: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          ...workerFilter,
        },
      }),
      this.prisma.workPermitApplicationProfile.count({
        where: {
          status: WorkPermitApplicationProfileStatus.ACTIVE,
          ...workerFilter,
        },
      }),
    ]);

    return {
      departmentScopeLabel:
        context.scope.primaryAppointment?.departmentName ?? 'Labour department scope',
      disclaimer: this.boundary.rulesDisclaimer,
      queues: [
        {
          queueKey: 'employer_registration',
          label: 'Employer registration queue',
          count: employerRegistrationQueue,
        },
        { queueKey: 'work_permit', label: 'Work permit queue', count: workPermitQueue },
        {
          queueKey: 'labour_market_determination',
          label: 'Labour-market / immigration coordination queue',
          count: labourMarketQueue,
        },
        {
          queueKey: 'professional_qualification',
          label: 'Professional qualification dependency queue',
          count: qualificationQueue,
        },
        {
          queueKey: 'workforce_declaration_review',
          label: 'Workforce declaration review',
          count: workforceDeclarationReview,
        },
        { queueKey: 'inspection', label: 'Inspection queue', count: inspectionQueue },
        {
          queueKey: 'corrective_action',
          label: 'Corrective action queue',
          count: correctiveActionQueue,
        },
        { queueKey: 'complaint', label: 'Complaint queue', count: complaintQueue },
        { queueKey: 'dispute', label: 'Dispute queue', count: disputeQueue },
        { queueKey: 'renewals', label: 'Renewals', count: renewals },
        { queueKey: 'permit_expirations', label: 'Permit expirations', count: permitExpirations },
      ],
      slaRiskCount: slaRisk,
    };
  }

  async buildDashboard(context: ResolvedOfficialContext) {
    const workspace = await this.buildWorkspace(context);
    const jurisdictionFilter = this.scope.buildOfficialJurisdictionFilter(
      context.institutionalContext.jurisdictionIds,
    );
    const workerFilter = this.scope.buildWorkerJurisdictionFilter(
      context.institutionalContext.jurisdictionIds,
    );

    const [workPermitVolume, activeEmployers, foreignWorkerPermits, complianceBacklog] =
      await Promise.all([
        this.prisma.workPermitRecord.count({ where: workerFilter }),
        this.prisma.employerRegistryRecord.count({
          where: { registrationStatus: EmployerRegistryStatus.REGISTERED, ...jurisdictionFilter },
        }),
        this.prisma.workPermitRecord.count({
          where: {
            immigrationProfileId: { not: null },
            ...workerFilter,
          },
        }),
        this.prisma.labourComplianceMatterReference.count({
          where: { employerRegistryRecord: jurisdictionFilter },
        }),
      ]);

    return {
      ...workspace,
      indicators: [
        {
          indicatorKey: 'work_permit_volume',
          label: 'Work permit volume',
          value: workPermitVolume,
        },
        {
          indicatorKey: 'processing_time',
          label: 'Processing time (template placeholder)',
          value: null,
          suppressedForSmallPopulation: true,
        },
        {
          indicatorKey: 'active_employer_registrations',
          label: 'Active employer registrations',
          value: activeEmployers,
        },
        {
          indicatorKey: 'foreign_worker_permits',
          label: 'Foreign worker permits (aggregated)',
          value: foreignWorkerPermits,
          suppressedForSmallPopulation: foreignWorkerPermits < 5,
        },
        {
          indicatorKey: 'compliance_backlog',
          label: 'Compliance backlog',
          value: complianceBacklog,
        },
        {
          indicatorKey: 'cross_agency_dependencies',
          label: 'Cross-agency dependencies',
          value:
            workspace.queues.find((q) => q.queueKey === 'labour_market_determination')?.count ?? 0,
        },
      ],
      analyticsCannotApprovePermits: true,
    };
  }

  async getAvailableActions(context: ResolvedOfficialContext, workPermitRecordId: string) {
    const permit = await this.prisma.workPermitRecord.findUnique({
      where: { id: workPermitRecordId },
      include: { workerProfileReference: true },
    });
    if (!permit) {
      throw new NotFoundException('Work permit record not found');
    }

    const decideFunction = await this.prisma.functionAuthorityRecord.findFirst({
      where: { code: 'TEMPLATE-AUTH-LABOUR-DECIDE' },
    });

    const actions = [];
    for (const candidate of LABOUR_OFFICIAL_ACTIONS) {
      if (!candidate.isConsequential) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: true,
          unavailableReason: null,
        });
        continue;
      }

      if (!decideFunction) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Labour decision authority is not configured',
        });
        continue;
      }

      if (decideFunction.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Authority function is suspended',
        });
        continue;
      }

      const dependencies = await this.prisma.authorityDependency.findMany({
        where: { functionAuthorityRecordId: decideFunction.id },
      });
      const dependencyFailures = await this.dependencyEvaluator.evaluate(
        decideFunction.id,
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
        functionAuthorityRecordId: decideFunction.id,
        action: candidate.authorityAction,
        officeholderId: context.scope.primaryAppointment?.officeholderId,
        officeId: context.scope.primaryAppointment?.officeId,
        appointmentId: context.scope.primaryAppointment?.appointmentId,
        delegationId: context.scope.activeDelegations[0]?.delegationId,
        priorActions: [],
        hasSecondApproval: false,
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

    return { workPermitRecordId, actions };
  }
}
