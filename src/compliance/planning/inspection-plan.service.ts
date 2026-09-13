import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IdentityType,
  InspectionPlanStatus,
  InspectionPlanTriggerType,
  InspectionTypeDefinitionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { INSPECTION_NUMBER_PREFIX } from '../compliance.constants';
import {
  InspectionPlanningBoundaryService,
  type RiskFactorRecord,
} from './inspection-planning-boundary.service';

export interface CreateInspectionPlanInput {
  complianceMatterId: string;
  inspectionTypeDefinitionId: string;
  triggerType: InspectionPlanTriggerType;
  triggerReference: string;
  scope: string;
  location?: string;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  requirementsToExamine?: unknown[];
  evidencePlan?: unknown[];
  safetyRequirements?: unknown[];
  confidentiality?: Record<string, unknown>;
  riskFactors?: RiskFactorRecord[];
  riskScore?: number;
  authorizedConditionId?: string;
  createdByIdentityId: string;
  actorIdentityType: IdentityType;
}

export interface UpdateInspectionPlanScopeInput {
  planId: string;
  scope: string;
  actorIdentityType: IdentityType;
}

@Injectable()
export class InspectionPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionPlanningBoundaryService,
  ) {}

  async createPlan(input: CreateInspectionPlanInput) {
    this.boundary.assertAiCannotOrderInspection(input.actorIdentityType);
    this.boundary.assertTriggerReferenceProvided(input.triggerReference);
    this.boundary.assertSchedulingDoesNotEstablishViolation();

    const riskFactors = input.riskFactors ?? [];
    this.boundary.assertRiskScoreNotSoleBasis(riskFactors, input.riskScore);

    const typeDefinition = await this.prisma.inspectionTypeDefinition.findUnique({
      where: { id: input.inspectionTypeDefinitionId },
    });

    if (!typeDefinition) {
      throw new NotFoundException('Inspection type definition not found');
    }

    if (typeDefinition.status !== InspectionTypeDefinitionStatus.ACTIVE) {
      throw new BadRequestException('Inspection type definition must be ACTIVE');
    }

    const matter = await this.prisma.complianceMatter.findUnique({
      where: { id: input.complianceMatterId },
      include: { responsibleInstitution: true },
    });

    if (!matter) {
      throw new NotFoundException('Compliance matter not found');
    }

    const matterJurisdictionId = matter.responsibleInstitution.jurisdictionId;
    this.boundary.assertJurisdictionMatches(matterJurisdictionId, typeDefinition.jurisdictionId);

    if (input.triggerType === InspectionPlanTriggerType.CONDITION_REQUIRED && !input.authorizedConditionId) {
      throw new BadRequestException(
        'Condition-required inspections must reference an authorized condition',
      );
    }

    const inspectionNumber = await this.generateInspectionNumber();

    return this.prisma.inspectionPlan.create({
      data: {
        inspectionNumber,
        complianceMatterId: input.complianceMatterId,
        inspectionTypeDefinitionId: input.inspectionTypeDefinitionId,
        functionAuthorityRecordId: typeDefinition.functionAuthorityRecordId,
        jurisdictionId: matterJurisdictionId,
        triggerType: input.triggerType,
        triggerReference: input.triggerReference,
        scope: input.scope,
        location: input.location,
        scheduledFrom: input.scheduledFrom,
        scheduledTo: input.scheduledTo,
        requirementsToExamine: (input.requirementsToExamine ?? []) as Prisma.InputJsonValue,
        evidencePlan: (input.evidencePlan ?? []) as Prisma.InputJsonValue,
        safetyRequirements: (input.safetyRequirements ?? []) as Prisma.InputJsonValue,
        confidentiality: (input.confidentiality ?? {}) as Prisma.InputJsonValue,
        riskFactors: riskFactors as unknown as Prisma.InputJsonValue,
        riskScore: input.riskScore,
        authorizedConditionId: input.authorizedConditionId,
        createdByIdentityId: input.createdByIdentityId,
        status: InspectionPlanStatus.DRAFT,
      },
      include: {
        inspectionTypeDefinition: true,
        complianceMatter: true,
      },
    });
  }

  async updateScope(input: UpdateInspectionPlanScopeInput) {
    this.boundary.assertAiCannotOrderInspection(input.actorIdentityType);

    const plan = await this.prisma.inspectionPlan.findUnique({ where: { id: input.planId } });
    if (!plan) {
      throw new NotFoundException('Inspection plan not found');
    }

    if (plan.status !== InspectionPlanStatus.DRAFT && plan.status !== InspectionPlanStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Scope may only be amended during draft planning');
    }

    this.boundary.assertScopeNotSilentlyExpanded(plan.scope, input.scope);

    return this.prisma.inspectionPlan.update({
      where: { id: input.planId },
      data: { scope: input.scope },
    });
  }

  riskScoreAloneCannotCreateViolation(): boolean {
    return true;
  }

  private async generateInspectionNumber(): Promise<string> {
    const count = await this.prisma.inspectionPlan.count();
    return `${INSPECTION_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
