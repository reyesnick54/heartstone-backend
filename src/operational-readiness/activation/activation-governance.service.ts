import { BadRequestException, Injectable } from '@nestjs/common';
import { ActivationConditionStatus, SafeHaltTriggerType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CapabilityDefinitionService } from '../capabilities/capability-definition.service';
import { OPERATIONAL_READINESS_REASON_CODES } from '../operational-readiness.constants';

export interface CreateActivationConditionInput {
  capabilityDefinitionId: string;
  conditionText: string;
  ownerIdentityId?: string;
  ownerOfficeholderId?: string;
  evidenceReference?: string;
  deadline?: Date;
  isMandatory?: boolean;
}

export interface UpdateActivationConditionStatusInput {
  conditionId: string;
  status: ActivationConditionStatus;
  verificationNotes?: string;
  evidenceReference?: string;
}

export interface CreateActivationRestrictionInput {
  capabilityDefinitionId: string;
  restrictionText: string;
  restrictionBasis?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

export interface CreateSafeHaltConditionInput {
  capabilityDefinitionId: string;
  triggerType: SafeHaltTriggerType;
  triggerDescription: string;
  haltAction?: string;
}

@Injectable()
export class ActivationGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionService: CapabilityDefinitionService,
  ) {}

  async createCondition(input: CreateActivationConditionInput) {
    await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    return this.prisma.activationCondition.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        conditionText: input.conditionText,
        ownerIdentityId: input.ownerIdentityId,
        ownerOfficeholderId: input.ownerOfficeholderId,
        evidenceReference: input.evidenceReference,
        deadline: input.deadline,
        isMandatory: input.isMandatory ?? true,
        status: ActivationConditionStatus.PENDING,
      },
    });
  }

  async updateConditionStatus(input: UpdateActivationConditionStatusInput) {
    return this.prisma.activationCondition.update({
      where: { id: input.conditionId },
      data: {
        status: input.status,
        verificationNotes: input.verificationNotes,
        evidenceReference: input.evidenceReference,
      },
    });
  }

  async createRestriction(input: CreateActivationRestrictionInput) {
    await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    return this.prisma.activationRestriction.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        restrictionText: input.restrictionText,
        restrictionBasis: input.restrictionBasis,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      },
    });
  }

  async createSafeHaltCondition(input: CreateSafeHaltConditionInput) {
    await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    return this.prisma.capabilitySafeHaltCondition.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        triggerType: input.triggerType,
        triggerDescription: input.triggerDescription,
        haltAction: input.haltAction,
      },
    });
  }

  async evaluateMandatoryConditions(capabilityDefinitionId: string) {
    const conditions = await this.prisma.activationCondition.findMany({
      where: { capabilityDefinitionId, isMandatory: true },
    });

    const unsatisfied = conditions.filter(
      (condition) => condition.status !== ActivationConditionStatus.SATISFIED,
    );

    return {
      allMandatorySatisfied: unsatisfied.length === 0,
      totalMandatory: conditions.length,
      unsatisfiedConditions: unsatisfied,
    };
  }

  assertActivationConditionsNotActivation(): void {
    throw new BadRequestException(
      `${OPERATIONAL_READINESS_REASON_CODES.ACTIVATION_NOT_PRODUCTION}: ActivationCondition records conditions; it is not operational activation`,
    );
  }
}
