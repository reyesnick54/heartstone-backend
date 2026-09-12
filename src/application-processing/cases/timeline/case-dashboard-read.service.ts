import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType } from '@prisma/client';

import { AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../../database/prisma.service';
import { CaseEventService } from './case-event.service';
import { CaseMilestoneService } from './case-milestone.service';

export interface AuthorizedAdministrativeAction {
  functionAuthorityRecordId: string;
  publicStageLabel: string | null;
  sequenceOrder: number;
  evaluationOutcome: string;
  requiresAuthority: boolean;
}

export interface CaseDashboardReadModel {
  caseNumber: string;
  applicant: { identityId: string; displayName: string };
  service: { id: string; publicName: string; code: string };
  department: { id: string; name: string };
  caseManager: { officeholderId: string; name: string } | null;
  workflowStage: { stageKey: string | null; stageLabel: string | null; status: string } | null;
  outstandingTasks: { stepKey: string; stepLabel: string | null; status: string }[];
  sla: {
    milestoneId: string;
    name: string;
    targetDate: string | null;
    status: string;
    sourceSlaReference: string | null;
  }[];
  dependencies: { reference: string; status: string }[];
  openIssues: { type: string; summary: string }[];
  recentEvents: {
    id: string;
    eventType: string;
    occurredAt: string;
    publicVisibility: string;
  }[];
  nextAuthorizedAdministrativeActions: AuthorizedAdministrativeAction[];
  assignmentDoesNotImplyAuthority: true;
}

@Injectable()
export class CaseDashboardReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEventService: CaseEventService,
    private readonly caseMilestoneService: CaseMilestoneService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async buildDashboard(
    caseId: string,
    actorIdentityId: string,
    actorOfficeholderId?: string,
  ): Promise<CaseDashboardReadModel> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        applicantIdentity: true,
        governmentService: true,
        responsibleDepartment: true,
        currentCaseManagerOfficeholder: true,
        workflowInstances: {
          where: { status: { in: ['ACTIVE', 'PAUSED', 'SAFE_HALT'] } },
          include: {
            stepInstances: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    const activeWorkflow = caseRecord.workflowInstances[0] ?? null;
    const milestones = await this.caseMilestoneService.listForCase(caseId);
    const recentEvents = await this.caseEventService.listOfficialTimeline(caseId, 20);

    const functionMappings = await this.prisma.serviceFunctionMapping.findMany({
      where: {
        governmentServiceVersionId: caseRecord.governmentServiceVersionId,
        status: 'ACTIVE',
      },
      orderBy: { sequenceOrder: 'asc' },
    });

    const nextAuthorizedAdministrativeActions: AuthorizedAdministrativeAction[] = [];

    for (const mapping of functionMappings) {
      const evaluation = await this.authorityEvaluation.evaluate({
        identityId: actorIdentityId,
        officeholderId: actorOfficeholderId,
        functionAuthorityRecordId: mapping.functionAuthorityRecordId,
        action: AuthorityActionType.APPROVE,
      });

      nextAuthorizedAdministrativeActions.push({
        functionAuthorityRecordId: mapping.functionAuthorityRecordId,
        publicStageLabel: mapping.publicStageLabel,
        sequenceOrder: mapping.sequenceOrder,
        evaluationOutcome: evaluation.outcome,
        requiresAuthority: mapping.isConsequential,
      });
    }

    return {
      caseNumber: caseRecord.caseNumber,
      applicant: {
        identityId: caseRecord.applicantIdentityId,
        displayName: caseRecord.applicantIdentity.displayName,
      },
      service: {
        id: caseRecord.governmentServiceId,
        publicName: caseRecord.governmentService.publicName,
        code: caseRecord.governmentService.code,
      },
      department: {
        id: caseRecord.responsibleDepartmentId,
        name: caseRecord.responsibleDepartment.name,
      },
      caseManager: caseRecord.currentCaseManagerOfficeholder
        ? {
            officeholderId: caseRecord.currentCaseManagerOfficeholder.id,
            name: caseRecord.currentCaseManagerOfficeholder.name,
          }
        : null,
      workflowStage: activeWorkflow
        ? {
            stageKey: activeWorkflow.currentStageKey,
            stageLabel: activeWorkflow.currentStageLabel,
            status: activeWorkflow.status,
          }
        : null,
      outstandingTasks: (activeWorkflow?.stepInstances ?? []).map((step) => ({
        stepKey: step.stepKey,
        stepLabel: step.stepLabel,
        status: step.status,
      })),
      sla: milestones.map((milestone) => ({
        milestoneId: milestone.id,
        name: milestone.name,
        targetDate: milestone.targetDate?.toISOString() ?? null,
        status: milestone.status,
        sourceSlaReference: milestone.sourceSlaReference,
      })),
      dependencies: milestones
        .filter((milestone): milestone is typeof milestone & { dependencyReference: string } =>
          Boolean(milestone.dependencyReference),
        )
        .map((milestone) => ({
          reference: milestone.dependencyReference,
          status: milestone.status,
        })),
      openIssues: milestones
        .filter((milestone) => milestone.status === 'AT_RISK' || milestone.status === 'DELAYED')
        .map((milestone) => ({
          type: 'MILESTONE',
          summary: `${milestone.name} is ${milestone.status.toLowerCase().replace('_', ' ')}`,
        })),
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        occurredAt: event.occurredAt.toISOString(),
        publicVisibility: event.publicVisibility,
      })),
      nextAuthorizedAdministrativeActions,
      assignmentDoesNotImplyAuthority: true,
    };
  }
}
