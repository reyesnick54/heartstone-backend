import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  type CaseAssignment,
  CaseAssignmentStatus,
  CaseAssignmentType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { CASE_COORDINATION_EXPLANATION_CODES } from '../applications-workflow.constants';

export interface CreateCaseAssignmentInput {
  caseId: string;
  assignmentType: CaseAssignmentType;
  assignedOfficeholderId: string;
  assignedOfficeId?: string;
  assignedDepartmentId?: string;
  assignedByIdentityId: string;
  assignedByOfficeholderId?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  purpose?: string;
}

export interface AssignmentAuthorityCheckResult {
  createsAuthority: false;
  explanationCode: string;
  canApproveByAssignment: false;
}

@Injectable()
export class CaseAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createAssignment(input: CreateCaseAssignmentInput): Promise<CaseAssignment> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    return this.prisma.caseAssignment.create({
      data: {
        caseId: input.caseId,
        assignmentType: input.assignmentType,
        assignedOfficeholderId: input.assignedOfficeholderId,
        assignedOfficeId: input.assignedOfficeId,
        assignedDepartmentId: input.assignedDepartmentId,
        assignedByIdentityId: input.assignedByIdentityId,
        assignedByOfficeholderId: input.assignedByOfficeholderId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        status: CaseAssignmentStatus.ACTIVE,
        purpose: input.purpose,
      },
    });
  }

  /** Assignment is operational coordination only — it never creates authority. */
  assignmentDoesNotCreateAuthority(): AssignmentAuthorityCheckResult {
    return {
      createsAuthority: false,
      explanationCode: CASE_COORDINATION_EXPLANATION_CODES.ASSIGNMENT_NOT_AUTHORITY,
      canApproveByAssignment: false,
    };
  }

  /** Case manager role enables coordination but never substitutes for Phase 4 evaluation. */
  async canApproveByAssignment(
    caseId: string,
    officeholderId: string,
    functionAuthorityRecordId: string,
    actorIdentityId: string,
  ): Promise<{ permitted: false; reason: string }> {
    const activeCaseManager = await this.prisma.caseAssignment.findFirst({
      where: {
        caseId,
        assignedOfficeholderId: officeholderId,
        assignmentType: CaseAssignmentType.CASE_MANAGER,
        status: CaseAssignmentStatus.ACTIVE,
      },
    });

    if (!activeCaseManager) {
      return {
        permitted: false,
        reason: 'No active case manager assignment for this actor',
      };
    }

    // Assignment alone never grants approval, even when Phase 4 would otherwise allow the actor.
    await this.authorityEvaluation.evaluate({
      functionAuthorityRecordId,
      identityId: actorIdentityId,
      action: AuthorityActionType.APPROVE,
      officeholderId,
    });

    return {
      permitted: false,
      reason: CASE_COORDINATION_EXPLANATION_CODES.CASE_MANAGER_NOT_DECISION_MAKER,
    };
  }

  async hasActiveCaseManager(caseId: string, officeholderId: string): Promise<boolean> {
    const assignment = await this.prisma.caseAssignment.findFirst({
      where: {
        caseId,
        assignedOfficeholderId: officeholderId,
        assignmentType: CaseAssignmentType.CASE_MANAGER,
        status: CaseAssignmentStatus.ACTIVE,
      },
    });
    return assignment !== null;
  }
}
