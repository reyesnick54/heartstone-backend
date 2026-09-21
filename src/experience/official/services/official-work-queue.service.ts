import { Injectable } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  CaseAssignmentStatus,
  CaseMilestoneStatus,
  CasePriority,
  CaseReferralStatus,
  CaseSlaClockStatus,
  CaseStatus,
  CaseWorkflowStepInstanceStatus,
  InspectionStatus,
  IntelligenceAlertStatus,
  OfficialInstrumentStatus,
  ReviewAssignmentStatus,
  WorkflowStepType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  OfficialWorkQueueEntryDto,
  OfficialWorkQueueResponseDto,
} from '../dto/official-work-queue-response.dto';
import { OFFICIAL_QUEUE_ITEM_TYPES } from '../official-experience.constants';
import { type ResolvedOfficialContext } from '../types/official-context.types';
import { OfficialScopeService } from './official-scope.service';

@Injectable()
export class OfficialWorkQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: OfficialScopeService,
  ) {}

  async buildWorkQueue(context: ResolvedOfficialContext): Promise<OfficialWorkQueueResponseDto> {
    const items: OfficialWorkQueueEntryDto[] = [];
    const scopeFilter = this.scopeService.buildCaseScopeFilter(context);
    const now = new Date();
    const renewalHorizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const scopedCases = await this.prisma.case.findMany({
      where: scopeFilter,
      include: {
        governmentService: { select: { publicName: true } },
        responsibleDepartment: { select: { id: true, name: true } },
        responsibleInstitution: { select: { id: true, name: true } },
        currentCaseManagerOfficeholder: { select: { id: true, name: true } },
        assignments: { where: { status: CaseAssignmentStatus.ACTIVE } },
        workflowInstance: {
          include: {
            stepInstances: {
              where: {
                status: {
                  in: [
                    CaseWorkflowStepInstanceStatus.PENDING,
                    CaseWorkflowStepInstanceStatus.ACTIVE,
                    CaseWorkflowStepInstanceStatus.WAITING_APPLICANT,
                    CaseWorkflowStepInstanceStatus.WAITING_EXTERNAL,
                  ],
                },
              },
              include: { workflowStepDefinition: true },
            },
          },
        },
        application: {
          include: {
            submissions: {
              include: {
                applicantInformationRequests: {
                  where: { status: ApplicantInformationRequestStatus.ISSUED },
                },
              },
            },
          },
        },
        referrals: { where: { status: CaseReferralStatus.PENDING } },
        milestones: {
          where: { status: { in: [CaseMilestoneStatus.AT_RISK, CaseMilestoneStatus.DELAYED] } },
        },
        slaClocks: {
          where: {
            status: { in: [CaseSlaClockStatus.RUNNING, CaseSlaClockStatus.BREACHED] },
          },
        },
        inspectionRecords: {
          where: { status: { in: [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS] } },
        },
      },
      take: 200,
    });

    for (const caseRecord of scopedCases) {
      const access = this.scopeService.evaluateCaseAccess(context.scope, caseRecord);
      const priority = this.mapPriority(caseRecord.priority);
      const baseEntry = {
        institutionId: caseRecord.responsibleInstitutionId,
        institutionName: caseRecord.responsibleInstitution.name,
        departmentId: caseRecord.responsibleDepartmentId,
        departmentName: caseRecord.responsibleDepartment.name,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        serviceName: caseRecord.governmentService.publicName,
        assignedOfficeholderId: caseRecord.currentCaseManagerOfficeholder?.id ?? null,
        assignedOfficeholderName: caseRecord.currentCaseManagerOfficeholder?.name ?? null,
      };

      if (access.accessKind === 'ASSIGNED') {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.ASSIGNED_CASE,
          priority,
          deadlineAt: this.earliestSlaTarget(caseRecord.slaClocks, caseRecord.milestones),
          status: caseRecord.status,
          actionRoute: `/experience/official/cases/${caseRecord.id}`,
          reason: 'Case assigned to you',
          sortKey: `1-${caseRecord.openedAt.toISOString()}`,
        });
      } else if (access.accessKind === 'DEPARTMENT_POOL') {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.DEPARTMENT_UNASSIGNED_CASE,
          priority,
          deadlineAt: this.earliestSlaTarget(caseRecord.slaClocks, caseRecord.milestones),
          status: caseRecord.status,
          actionRoute: `/experience/official/cases/${caseRecord.id}`,
          reason: 'Unassigned case in your department pool',
          sortKey: `2-${caseRecord.openedAt.toISOString()}`,
        });
      }

      for (const step of caseRecord.workflowInstance?.stepInstances ?? []) {
        const reviewStepTypes = new Set<WorkflowStepType>([
          WorkflowStepType.SUBSTANTIVE_REVIEW,
          WorkflowStepType.PROFESSIONAL_REVIEW,
          WorkflowStepType.COMPLETENESS_REVIEW,
        ]);
        if (reviewStepTypes.has(step.workflowStepDefinition.stepType)) {
          items.push({
            ...baseEntry,
            queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.AWAITING_REVIEW,
            priority,
            deadlineAt: this.earliestSlaTarget(caseRecord.slaClocks, caseRecord.milestones),
            status: step.status,
            actionRoute: `/experience/official/cases/${caseRecord.id}/available-actions`,
            reason: `Workflow step "${step.workflowStepDefinition.stepKey}" awaiting review`,
            sortKey: `3-${step.startedAt?.toISOString() ?? caseRecord.openedAt.toISOString()}`,
          });
        }
      }

      if (caseRecord.referrals.length > 0) {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.PENDING_REFERRAL,
          priority,
          deadlineAt: null,
          status: 'PENDING',
          actionRoute: `/api/v1/cases/${caseRecord.id}/referrals`,
          reason: 'External referral pending response',
          sortKey: `4-${caseRecord.openedAt.toISOString()}`,
        });
      }

      const hasInformationRequests = caseRecord.application.submissions.some(
        (submission) => submission.applicantInformationRequests.length > 0,
      );
      if (hasInformationRequests) {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.INFORMATION_REQUEST,
          priority: 'NORMAL',
          deadlineAt: null,
          status: 'ISSUED',
          actionRoute: `/experience/official/cases/${caseRecord.id}`,
          reason: 'Applicant information request outstanding',
          sortKey: `5-${caseRecord.openedAt.toISOString()}`,
        });
      }

      if (caseRecord.status === CaseStatus.DECISION_PENDING) {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.DECISION_READY,
          priority: 'HIGH',
          deadlineAt: this.earliestSlaTarget(caseRecord.slaClocks, caseRecord.milestones),
          status: caseRecord.status,
          actionRoute: `/experience/official/cases/${caseRecord.id}/available-actions`,
          reason: 'Case is decision-ready',
          sortKey: `6-${caseRecord.openedAt.toISOString()}`,
        });
      }

      for (const milestone of caseRecord.milestones) {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.SLA_RISK,
          priority: 'URGENT',
          deadlineAt: milestone.targetDate?.toISOString() ?? null,
          status: milestone.status,
          actionRoute: `/experience/official/cases/${caseRecord.id}`,
          reason: `Milestone "${milestone.name}" is ${milestone.status.toLowerCase().replace('_', ' ')}`,
          sortKey: `0-${milestone.targetDate?.toISOString() ?? caseRecord.openedAt.toISOString()}`,
        });
      }

      for (const clock of caseRecord.slaClocks.filter(
        (sla) => sla.status === CaseSlaClockStatus.BREACHED,
      )) {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.SLA_RISK,
          priority: 'URGENT',
          deadlineAt: null,
          status: clock.status,
          actionRoute: `/experience/official/cases/${caseRecord.id}`,
          reason: `SLA clock "${clock.clockKey}" is breached`,
          sortKey: `0-${caseRecord.openedAt.toISOString()}`,
        });
      }

      if (caseRecord.inspectionRecords.length > 0) {
        items.push({
          ...baseEntry,
          queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.INSPECTION_TASK,
          priority,
          deadlineAt: caseRecord.inspectionRecords[0]?.inspectionDate.toISOString() ?? null,
          status: caseRecord.inspectionRecords[0]?.status ?? 'SCHEDULED',
          actionRoute: `/api/v1/compliance/inspections`,
          reason: 'Inspection task scheduled or in progress',
          sortKey: `7-${caseRecord.openedAt.toISOString()}`,
        });
      }
    }

    const reviewAssignments = await this.prisma.reviewAssignment.findMany({
      where: {
        reviewerIdentityId: context.identityId,
        status: {
          in: [ReviewAssignmentStatus.ACTIVE, ReviewAssignmentStatus.PENDING_VALIDATION],
        },
      },
      include: {
        jurisdiction: { select: { id: true, name: true } },
      },
      take: 50,
    });

    for (const assignment of reviewAssignments) {
      items.push({
        queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.APPEALS_ASSIGNMENT,
        priority: 'HIGH',
        institutionId: context.scope.institutionIds[0] ?? assignment.jurisdictionId,
        institutionName: assignment.jurisdiction.name,
        departmentId: context.scope.departmentIds[0] ?? assignment.jurisdictionId,
        departmentName: 'Redress',
        caseId: null,
        caseNumber: assignment.assignmentNumber,
        serviceName: null,
        deadlineAt: assignment.effectiveUntil?.toISOString() ?? null,
        status: assignment.status,
        assignedOfficeholderId: assignment.reviewerOfficeholderId,
        assignedOfficeholderName: null,
        actionRoute: `/api/v1/redress/review-assignments/${assignment.id}`,
        reason: 'Appeals or redress review assignment',
        sortKey: `8-${assignment.assignedAt.toISOString()}`,
      });
    }

    const expiringInstruments = await this.prisma.officialInstrument.findMany({
      where: {
        issuerInstitutionId: { in: context.scope.institutionIds },
        status: OfficialInstrumentStatus.ISSUED,
        effectiveUntil: { lte: renewalHorizon, gte: now },
      },
      include: { issuerInstitution: { select: { id: true, name: true } } },
      take: 50,
    });

    for (const instrument of expiringInstruments) {
      items.push({
        queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.INSTRUMENT_RENEWAL,
        priority: 'HIGH',
        institutionId: instrument.issuerInstitutionId,
        institutionName: instrument.issuerInstitution.name,
        departmentId: context.scope.departmentIds[0] ?? instrument.issuerInstitutionId,
        departmentName: 'Issuance',
        caseId: instrument.caseId,
        caseNumber: instrument.instrumentNumber,
        serviceName: null,
        deadlineAt: instrument.effectiveUntil?.toISOString() ?? null,
        status: instrument.status,
        assignedOfficeholderId: instrument.issuerOfficeholderId,
        assignedOfficeholderName: null,
        actionRoute: `/api/v1/instruments/${instrument.id}`,
        reason: 'Instrument renewal or expiry action required',
        sortKey: `9-${instrument.effectiveUntil?.toISOString() ?? now.toISOString()}`,
      });
    }

    const alerts = await this.prisma.intelligenceMonitoringAlert.findMany({
      where: {
        responsibleRecipientIdentityId: context.identityId,
        status: {
          in: [IntelligenceAlertStatus.GENERATED, IntelligenceAlertStatus.UNDER_REVIEW],
        },
      },
      take: 50,
    });

    for (const alert of alerts) {
      items.push({
        queueItemType: OFFICIAL_QUEUE_ITEM_TYPES.INTELLIGENCE_ALERT,
        priority: alert.isEmergency ? 'URGENT' : 'NORMAL',
        institutionId: context.scope.institutionIds[0] ?? context.identityId,
        institutionName: 'Intelligence',
        departmentId: context.scope.departmentIds[0] ?? context.identityId,
        departmentName: 'Monitoring',
        caseId: null,
        caseNumber: alert.alertNumber,
        serviceName: null,
        deadlineAt: null,
        status: alert.status,
        assignedOfficeholderId: null,
        assignedOfficeholderName: null,
        actionRoute: `/experience/official/alerts`,
        reason: alert.observedCondition,
        sortKey: `10-${alert.observedAt.toISOString()}`,
      });
    }

    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return {
      generatedAt: now.toISOString(),
      items: this.deduplicateQueueItems(items),
      totalCount: items.length,
    };
  }

  private mapPriority(priority: CasePriority): string {
    switch (priority) {
      case CasePriority.URGENT:
        return 'URGENT';
      case CasePriority.HIGH:
        return 'HIGH';
      case CasePriority.LOW:
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }

  private earliestSlaTarget(
    clocks: { targetDurationMs: number | null; startedAt: Date }[],
    milestones: { targetDate: Date | null }[],
  ): string | null {
    const milestoneTargets = milestones
      .map((milestone) => milestone.targetDate)
      .filter((target): target is Date => target !== null);

    const clockTargets = clocks
      .filter((clock) => clock.targetDurationMs !== null)
      .map((clock) => new Date(clock.startedAt.getTime() + (clock.targetDurationMs ?? 0)));

    const targets = [...milestoneTargets, ...clockTargets].sort(
      (a, b) => a.getTime() - b.getTime(),
    );
    return targets[0]?.toISOString() ?? null;
  }

  private deduplicateQueueItems(items: OfficialWorkQueueEntryDto[]): OfficialWorkQueueEntryDto[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.queueItemType}:${item.caseId ?? item.caseNumber ?? 'none'}:${item.reason}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
