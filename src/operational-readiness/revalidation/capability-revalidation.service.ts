import { Injectable } from '@nestjs/common';
import { CapabilityMaturityState, CapabilityRevalidationTrigger, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CapabilityDefinitionService } from '../capabilities/capability-definition.service';

export interface RecordRevalidationInput {
  capabilityDefinitionId: string;
  trigger: CapabilityRevalidationTrigger;
  description: string;
  requiredEvidence?: unknown[];
  triggeredByIdentityId?: string;
}

@Injectable()
export class CapabilityRevalidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionService: CapabilityDefinitionService,
  ) {}

  async recordRevalidationRequirement(input: RecordRevalidationInput) {
    const definition = await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    const requirement = await this.prisma.capabilityRevalidationRequirement.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        trigger: input.trigger,
        description: input.description,
        requiredEvidence: (input.requiredEvidence ?? []) as Prisma.InputJsonValue,
        isTriggered: true,
        triggeredAt: new Date(),
        triggeredByIdentityId: input.triggeredByIdentityId,
        priorMaturityState: definition.currentMaturityState,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.capabilityDefinition.update({
        where: { id: input.capabilityDefinitionId },
        data: {
          currentMaturityState: CapabilityMaturityState.REVALIDATION_REQUIRED,
          isOperational: false,
        },
      });

      const currentVersion = await tx.capabilityVersion.findFirst({
        where: { capabilityDefinitionId: input.capabilityDefinitionId, isCurrent: true },
      });

      if (currentVersion) {
        await tx.capabilityMaturityHistory.create({
          data: {
            capabilityDefinitionId: input.capabilityDefinitionId,
            capabilityVersionId: currentVersion.id,
            priorMaturity: definition.currentMaturityState,
            newMaturity: CapabilityMaturityState.REVALIDATION_REQUIRED,
            changeReason: `Material change triggered revalidation: ${input.trigger}`,
            changedByIdentityId: input.triggeredByIdentityId,
          },
        });
      }
    });

    return requirement;
  }

  async triggerFromMaterialChange(
    capabilityDefinitionId: string,
    trigger: CapabilityRevalidationTrigger,
    description: string,
    triggeredByIdentityId?: string,
  ) {
    return this.recordRevalidationRequirement({
      capabilityDefinitionId,
      trigger,
      description,
      triggeredByIdentityId,
    });
  }
}
