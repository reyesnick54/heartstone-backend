import { Injectable } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  CaseAssignmentStatus,
  CaseIssueStatus,
  CaseMilestoneStatus,
  CaseReferralStatus,
  CaseSlaClockStatus,
  CaseStatus,
  CaseWorkflowStepInstanceStatus,
  CommunicationMessageStatus,
  InspectionStatus,
  IntelligenceAlertStatus,
  OfficialInstrumentStatus,
  ReviewAssignmentStatus,
  ServiceAppointmentStatus,
  WorkflowStepType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { OfficialWorkspaceResponseDto } from '../dto/official-workspace-response.dto';
import { type ResolvedOfficialContext } from '../types/official-context.types';
import { OfficialScopeService } from './official-scope.service';

@Injectable()
export class OfficialWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: OfficialScopeService,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext): Promise<OfficialWorkspaceResponseDto> {
    const scopeFilter = this.scopeService.buildCaseScopeFilter(context);
    const now = new Date();
    const renewalHorizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const scopedCases = await this.prisma.case.findMany({
      where: scopeFilter,
      include: {
        governmentService: { select: { publicName: true } },
        responsibleDepartment: { select: { id: true, name: true } },
        responsibleInstitution: { select: { id: true, name: true } },
        currentCaseManagerOfficeholder: { select: { name: true } },
        assignments: { where: { status: CaseAssignmentStatus.ACTIVE } },
        workflowInstance: {
          include: {
            stepInstances: {
              where: {
                status: {
                  in: [
                    CaseWorkflowStepInstanceStatus.PENDING,
                    CaseWorkflowStepInstanceStatus.ACTIVE,
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
        issues: { where: { status: CaseIssueStatus.OPEN } },
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

    const toSummary = (
      caseRecord: (typeof scopedCases)[number],
      accessKind: string,
    ): {
      caseId: string;
      caseNumber: string;
      serviceName: string;
      status: string;
      assignedOfficeholderName: string | null;
      accessKind: string;
    } => ({
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      serviceName: caseRecord.governmentService.publicName,
      status: caseRecord.status,
      assignedOfficeholderName: caseRecord.currentCaseManagerOfficeholder?.name ?? null,
      accessKind,
    });

    const assignedCases = scopedCases.filter((caseRecord) =>
      caseRecord.assignments.some(
        (assignment) => assignment.assigneeIdentityId === context.identityId,
      ),
    );

    const departmentUnassignedCases = scopedCases.filter((caseRecord) => {
      const access = this.scopeService.evaluateCaseAccess(context.scope, caseRecord);
      return access.accessKind === 'DEPARTMENT_POOL';
    });

    const reviewStepTypes = new Set<WorkflowStepType>([
      WorkflowStepType.SUBSTANTIVE_REVIEW,
      WorkflowStepType.PROFESSIONAL_REVIEW,
      WorkflowStepType.COMPLETENESS_REVIEW,
    ]);
    const casesAwaitingReview = scopedCases.filter((caseRecord) =>
      (caseRecord.workflowInstance?.stepInstances ?? []).some((step) =>
        reviewStepTypes.has(step.workflowStepDefinition.stepType),
      ),
    );

    const completenessIssues = scopedCases.filter((caseRecord) =>
      caseRecord.issues.some((issue) => issue.title.toLowerCase().includes('completeness')),
    );

    const informationRequests = scopedCases.filter((caseRecord) =>
      caseRecord.application.submissions.some(
        (submission) => submission.applicantInformationRequests.length > 0,
      ),
    );

    const pendingReferrals = scopedCases.filter((caseRecord) => caseRecord.referrals.length > 0);

    const decisionReadyCases = scopedCases.filter(
      (caseRecord) => caseRecord.status === CaseStatus.DECISION_PENDING,
    );

    const slaRisks = scopedCases.flatMap((caseRecord) => [
      ...caseRecord.milestones.map((milestone) => ({
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        clockKey: milestone.name,
        status: milestone.status,
        targetAt: milestone.targetDate?.toISOString() ?? null,
      })),
      ...caseRecord.slaClocks
        .filter((clock) => clock.status === CaseSlaClockStatus.BREACHED)
        .map((clock) => ({
          caseId: caseRecord.id,
          caseNumber: caseRecord.caseNumber,
          clockKey: clock.clockKey,
          status: clock.status,
          targetAt: null,
        })),
    ]);

    const inspectionTasks = scopedCases.filter(
      (caseRecord) => caseRecord.inspectionRecords.length > 0,
    );

    const appealsAssignments = await this.prisma.reviewAssignment.findMany({
      where: {
        reviewerIdentityId: context.identityId,
        status: {
          in: [ReviewAssignmentStatus.ACTIVE, ReviewAssignmentStatus.PENDING_VALIDATION],
        },
      },
      take: 50,
    });

    const expiringInstruments = await this.prisma.officialInstrument.findMany({
      where: {
        issuerInstitutionId: { in: context.scope.institutionIds },
        status: OfficialInstrumentStatus.ISSUED,
        effectiveUntil: { lte: renewalHorizon, gte: now },
      },
      take: 50,
    });

    const governmentMessages = await this.prisma.communicationMessage.findMany({
      where: {
        recipients: {
          some: { recipientIdentityId: context.identityId },
        },
        status: { not: CommunicationMessageStatus.DELIVERED },
      },
      take: 50,
    });

    const upcomingAppointments = await this.prisma.serviceAppointment.count({
      where: {
        departmentId: { in: context.scope.departmentIds },
        status: {
          in: [
            ServiceAppointmentStatus.SCHEDULED,
            ServiceAppointmentStatus.CONFIRMED,
            ServiceAppointmentStatus.RESCHEDULED,
          ],
        },
        scheduledStartsAt: { gte: now },
      },
    });

    const intelligenceAlerts = await this.prisma.intelligenceMonitoringAlert.findMany({
      where: {
        responsibleRecipientIdentityId: context.identityId,
        status: {
          in: [IntelligenceAlertStatus.GENERATED, IntelligenceAlertStatus.UNDER_REVIEW],
        },
      },
      take: 50,
    });

    return {
      generatedAt: now.toISOString(),
      assignedCases: {
        count: assignedCases.length,
        items: assignedCases.map((c) => toSummary(c, 'ASSIGNED')),
      },
      departmentUnassignedCases: {
        count: departmentUnassignedCases.length,
        items: departmentUnassignedCases.map((c) => toSummary(c, 'DEPARTMENT_POOL')),
      },
      casesAwaitingReview: {
        count: casesAwaitingReview.length,
        items: casesAwaitingReview.map((c) => toSummary(c, 'AWAITING_REVIEW')),
      },
      completenessIssues: {
        count: completenessIssues.length,
        items: completenessIssues.map((c) => toSummary(c, 'COMPLETENESS_ISSUE')),
      },
      informationRequests: {
        count: informationRequests.length,
        items: informationRequests.map((c) => toSummary(c, 'INFORMATION_REQUEST')),
      },
      pendingReferrals: {
        count: pendingReferrals.length,
        items: pendingReferrals.map((c) => toSummary(c, 'PENDING_REFERRAL')),
      },
      decisionReadyCases: {
        count: decisionReadyCases.length,
        items: decisionReadyCases.map((c) => toSummary(c, 'DECISION_READY')),
      },
      slaRisks,
      inspectionTasks: {
        count: inspectionTasks.length,
        items: inspectionTasks.map((c) => toSummary(c, 'INSPECTION_TASK')),
      },
      appealsAssignments: {
        count: appealsAssignments.length,
        items: [],
      },
      expiringInstruments: {
        count: expiringInstruments.length,
        items: [],
      },
      governmentMessages: {
        count: governmentMessages.length,
        items: [],
      },
      intelligenceAlerts: intelligenceAlerts.map((alert) => ({
        alertId: alert.id,
        alertNumber: alert.alertNumber,
        observedCondition: alert.observedCondition,
        status: alert.status,
      })),
      upcomingAppointments,
      assignmentDoesNotImplyAuthority: true,
    };
  }
}
