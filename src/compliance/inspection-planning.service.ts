import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  InspectionAssignmentStatus,
  InspectionPlanStatus,
  InspectionType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../database/prisma.service';
import {
  COMPLIANCE_EXPLANATION_CODES,
  INSPECTION_PLAN_NUMBER_PREFIX,
} from './compliance.constants';

export interface CreateInspectionPlanInput {
  complianceMatterId?: string;
  officialInstrumentId?: string;
  inspectionTypeDefinitionId: string;
  scheduledFor: Date;
  scope: string;
}

export interface AssignInspectorInput {
  inspectionPlanId: string;
  inspectorOfficeholderId: string;
  inspectorIdentityId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
}

@Injectable()
export class InspectionPlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createPlan(input: CreateInspectionPlanInput) {
    const planNumber = `${INSPECTION_PLAN_NUMBER_PREFIX}-${Date.now()}`;

    return this.prisma.inspectionPlan.create({
      data: {
        planNumber,
        complianceMatterId: input.complianceMatterId,
        officialInstrumentId: input.officialInstrumentId,
        inspectionTypeDefinitionId: input.inspectionTypeDefinitionId,
        scheduledFor: input.scheduledFor,
        scope: input.scope,
        status: InspectionPlanStatus.DRAFT,
      },
    });
  }

  async schedulePlan(planId: string) {
    return this.prisma.inspectionPlan.update({
      where: { id: planId },
      data: { status: InspectionPlanStatus.SCHEDULED },
    });
  }

  async assignInspector(input: AssignInspectorInput) {
    const plan = await this.prisma.inspectionPlan.findUnique({
      where: { id: input.inspectionPlanId },
      include: { inspectionTypeDefinition: true },
    });
    if (!plan) {
      throw new NotFoundException(`Inspection plan "${input.inspectionPlanId}" was not found`);
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      identityId: input.inspectorIdentityId,
      officeholderId: input.inspectorOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
      action: AuthorityActionType.INSPECT,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException({
        message: 'Inspector assignment requires permitted INSPECT authority',
        code: COMPLIANCE_EXPLANATION_CODES.INSPECT_AUTHORITY_REQUIRED,
      });
    }

    return this.prisma.inspectionAssignment.create({
      data: {
        inspectionPlanId: input.inspectionPlanId,
        inspectorOfficeholderId: input.inspectorOfficeholderId,
        inspectorIdentityId: input.inspectorIdentityId,
        authorityEvaluationRecordId: evaluation.evaluationId,
        status: InspectionAssignmentStatus.ASSIGNED,
      },
    });
  }

  async ensureTypeDefinition(input: {
    code: string;
    name: string;
    inspectionType: InspectionType;
    description?: string;
  }) {
    return this.prisma.inspectionTypeDefinition.upsert({
      where: { code: input.code },
      create: {
        code: input.code,
        name: input.name,
        description: input.description,
        inspectionType: input.inspectionType,
      },
      update: {
        name: input.name,
        description: input.description,
      },
    });
  }
}
