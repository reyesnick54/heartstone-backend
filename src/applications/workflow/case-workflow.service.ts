import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationCaseWorkflowStage } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { APPLICATIONS_EXPLANATION_CODES } from '../applications.constants';
import { ALLOWED_CASE_WORKFLOW_TRANSITIONS } from './case-workflow.constants';

export interface WorkflowTransitionRequest {
  caseId: string;
  toStage: ApplicationCaseWorkflowStage;
  actorIdentityId?: string;
  reason?: string;
}

@Injectable()
export class CaseWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  assertTransitionAllowed(
    fromStage: ApplicationCaseWorkflowStage,
    toStage: ApplicationCaseWorkflowStage,
  ): void {
    const allowed = ALLOWED_CASE_WORKFLOW_TRANSITIONS[fromStage];
    if (!allowed.includes(toStage)) {
      throw new BadRequestException({
        message: `Workflow transition from ${fromStage} to ${toStage} is not permitted`,
        code: APPLICATIONS_EXPLANATION_CODES.INVALID_WORKFLOW_TRANSITION,
      });
    }
  }

  async transition(request: WorkflowTransitionRequest): Promise<{
    caseId: string;
    fromStage: ApplicationCaseWorkflowStage;
    toStage: ApplicationCaseWorkflowStage;
  }> {
    const caseRecord = await this.prisma.applicationCase.findUnique({
      where: { id: request.caseId },
    });

    if (!caseRecord) {
      throw new NotFoundException(`ApplicationCase "${request.caseId}" was not found`);
    }

    this.assertTransitionAllowed(caseRecord.currentWorkflowStage, request.toStage);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.applicationCase.update({
        where: { id: request.caseId },
        data: {
          currentWorkflowStage: request.toStage,
          workflowStageEnteredAt: now,
        },
      });

      await tx.applicationCaseWorkflowTransition.create({
        data: {
          caseId: request.caseId,
          fromStage: caseRecord.currentWorkflowStage,
          toStage: request.toStage,
          reason: request.reason,
          actorIdentityId: request.actorIdentityId,
        },
      });
    });

    return {
      caseId: request.caseId,
      fromStage: caseRecord.currentWorkflowStage,
      toStage: request.toStage,
    };
  }
}
