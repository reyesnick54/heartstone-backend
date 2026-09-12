import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Application,
  ApplicationSubmission,
  CaseEventType,
  CaseMilestoneStatus,
  CaseMilestoneType,
  CaseStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CASE_NUMBER_PREFIX } from '../application-processing.constants';
import { CaseAccessDeniedException } from '../common/exceptions/application-processing.exceptions';
import { generateReferenceNumber } from '../common/reference-number.util';
import { CasePublicStatusService } from '../public-status/case-public-status.service';
import { WorkflowDefinitionsService } from '../workflow/workflow-definitions.service';
import { WorkflowRuntimeService } from '../workflow/workflow-runtime.service';
import { CaseEventsService } from './case-events.service';
import { CaseStatusService } from './case-status.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowDefinitions: WorkflowDefinitionsService,
    private readonly workflowRuntime: WorkflowRuntimeService,
    private readonly caseStatus: CaseStatusService,
    private readonly caseEvents: CaseEventsService,
    private readonly publicStatus: CasePublicStatusService,
  ) {}

  async createFromSubmission(application: Application, submission: ApplicationSubmission) {
    const workflowVersion = await this.workflowDefinitions.resolveApprovedWorkflowForService(
      application.governmentServiceId,
    );

    const service = await this.prisma.governmentService.findUniqueOrThrow({
      where: { id: application.governmentServiceId },
      select: { responsibleInstitutionId: true, responsibleDepartmentId: true },
    });

    const caseRecord = await this.prisma.case.create({
      data: {
        caseNumber: generateReferenceNumber(CASE_NUMBER_PREFIX),
        applicationId: application.id,
        applicantIdentityId: application.applicantIdentityId,
        governmentServiceId: application.governmentServiceId,
        governmentServiceVersionId: application.governmentServiceVersionId,
        responsibleInstitutionId: service.responsibleInstitutionId,
        responsibleDepartmentId: service.responsibleDepartmentId,
        workflowVersionId: workflowVersion.id,
        configurationFingerprint: application.configurationFingerprint,
        status: CaseStatus.RECEIVED,
      },
    });

    await this.caseEvents.record(caseRecord.id, CaseEventType.CASE_CREATED, {
      applicationId: application.id,
      submissionId: submission.id,
    });

    await this.caseEvents.record(caseRecord.id, CaseEventType.ACKNOWLEDGMENT_ISSUED, {
      acknowledgmentReference: submission.acknowledgmentReference,
    });

    await this.prisma.caseMilestone.create({
      data: {
        caseId: caseRecord.id,
        milestoneType: CaseMilestoneType.RECEIPT,
        name: 'Application received',
        status: CaseMilestoneStatus.COMPLETED,
        reachedAt: new Date(),
        actualDate: new Date(),
      },
    });

    await this.caseEvents.record(caseRecord.id, CaseEventType.APPLICATION_RECEIVED, {
      submissionNumber: submission.submissionNumber,
    });

    await this.publicStatus.project(caseRecord.id, CaseStatus.RECEIVED);
    await this.caseStatus.transition(caseRecord.id, CaseStatus.INTAKE);
    await this.workflowRuntime.startWorkflow(caseRecord.id, workflowVersion.id);

    await this.prisma.caseSlaClock.create({
      data: {
        caseId: caseRecord.id,
        clockKey: 'PROCESSING',
        targetDurationMs: 24 * 24 * 60 * 60 * 1000,
      },
    });

    await this.caseEvents.record(caseRecord.id, CaseEventType.SLA_CLOCK_STARTED, {
      clockKey: 'PROCESSING',
    });

    return caseRecord;
  }

  async findById(caseId: string, requesterIdentityId: string, isOfficial = false) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        application: true,
        workflowInstance: {
          include: {
            stepInstances: { include: { workflowStepDefinition: true } },
          },
        },
        statusHistory: { orderBy: { recordedAt: 'asc' } },
        events: { orderBy: { recordedAt: 'asc' } },
        referrals: { include: { responses: true } },
        slaClocks: true,
        escalations: true,
        issues: true,
        publicStatusProjection: true,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    if (!isOfficial && caseRecord.application.applicantIdentityId !== requesterIdentityId) {
      throw new CaseAccessDeniedException();
    }

    return caseRecord;
  }

  async getApplicantStatus(caseId: string, applicantIdentityId: string) {
    const view = await this.publicStatus.getApplicantView(caseId, applicantIdentityId);
    if (!view) {
      throw new CaseAccessDeniedException();
    }
    return view;
  }
}
