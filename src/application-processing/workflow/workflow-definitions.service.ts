import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  Prisma,
  WorkflowDefinitionStatus,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
  WorkflowTransitionJoinType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { WorkflowSuspendedException } from '../common/exceptions/application-processing.exceptions';

export interface CreateWorkflowDefinitionInput {
  code: string;
  name: string;
  description?: string;
  governmentServiceId?: string;
}

export interface CreateWorkflowVersionInput {
  version: string;
  stages: {
    stageKey: string;
    label: string;
    description?: string;
    displayOrder: number;
  }[];
  steps: {
    stepKey: string;
    label: string;
    description?: string;
    stepType: WorkflowStepType;
    stageKey?: string;
    consequenceLevel?: WorkflowStepConsequenceLevel;
    functionAuthorityRecordId?: string;
    authorityActionType?: AuthorityActionType;
    displayOrder: number;
    isParallel?: boolean;
    parallelGroupKey?: string;
    joinType?: WorkflowTransitionJoinType;
    configuration?: Record<string, unknown>;
  }[];
  transitions: {
    transitionKey: string;
    fromStepKey: string;
    toStepKey: string;
    label?: string;
    joinType?: WorkflowTransitionJoinType;
    isDefault?: boolean;
  }[];
}

@Injectable()
export class WorkflowDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefinition(input: CreateWorkflowDefinitionInput) {
    return this.prisma.workflowDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        governmentServiceId: input.governmentServiceId,
        status: WorkflowDefinitionStatus.DRAFT,
      },
    });
  }

  async createVersion(workflowDefinitionId: string, input: CreateWorkflowVersionInput) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: workflowDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException('Workflow definition not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const version = await tx.workflowVersion.create({
        data: {
          workflowDefinitionId,
          version: input.version,
          status: WorkflowVersionStatus.DRAFT,
        },
      });

      const stageMap = new Map<string, string>();

      for (const stage of input.stages) {
        const created = await tx.workflowStageDefinition.create({
          data: {
            workflowVersionId: version.id,
            stageKey: stage.stageKey,
            label: stage.label,
            description: stage.description,
            displayOrder: stage.displayOrder,
          },
        });
        stageMap.set(stage.stageKey, created.id);
      }

      const stepMap = new Map<string, string>();

      for (const step of input.steps) {
        const created = await tx.workflowStepDefinition.create({
          data: {
            workflowVersionId: version.id,
            workflowStageDefinitionId: step.stageKey ? stageMap.get(step.stageKey) : undefined,
            stepKey: step.stepKey,
            label: step.label,
            description: step.description,
            stepType: step.stepType,
            consequenceLevel: step.consequenceLevel ?? WorkflowStepConsequenceLevel.ADMINISTRATIVE,
            functionAuthorityRecordId: step.functionAuthorityRecordId,
            authorityActionType: step.authorityActionType,
            displayOrder: step.displayOrder,
            isParallel: step.isParallel ?? false,
            parallelGroupKey: step.parallelGroupKey,
            joinType: step.joinType,
            configuration: (step.configuration ?? {}) as Prisma.InputJsonValue,
          },
        });
        stepMap.set(step.stepKey, created.id);
      }

      for (const transition of input.transitions) {
        const fromStepId = stepMap.get(transition.fromStepKey);
        const toStepId = stepMap.get(transition.toStepKey);

        if (!fromStepId || !toStepId) {
          throw new NotFoundException('Invalid workflow transition step reference');
        }

        await tx.workflowTransitionDefinition.create({
          data: {
            workflowVersionId: version.id,
            fromStepId,
            toStepId,
            transitionKey: transition.transitionKey,
            label: transition.label,
            joinType: transition.joinType ?? WorkflowTransitionJoinType.ALL_REQUIRED,
            isDefault: transition.isDefault ?? false,
          },
        });
      }

      return version;
    });
  }

  async approveVersion(workflowVersionId: string) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      include: { workflowDefinition: true },
    });

    if (!version) {
      throw new NotFoundException('Workflow version not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowDefinition.update({
        where: { id: version.workflowDefinitionId },
        data: { status: WorkflowDefinitionStatus.APPROVED },
      });

      return tx.workflowVersion.update({
        where: { id: workflowVersionId },
        data: {
          status: WorkflowVersionStatus.APPROVED,
          approvedAt: new Date(),
        },
      });
    });
  }

  async suspendVersion(workflowVersionId: string) {
    return this.prisma.workflowVersion.update({
      where: { id: workflowVersionId },
      data: { status: WorkflowVersionStatus.SUSPENDED },
    });
  }

  async resolveApprovedWorkflowForService(governmentServiceId: string) {
    const definition = await this.prisma.workflowDefinition.findFirst({
      where: {
        governmentServiceId,
        status: WorkflowDefinitionStatus.APPROVED,
      },
      include: {
        versions: {
          where: { status: WorkflowVersionStatus.APPROVED },
          orderBy: { approvedAt: 'desc' },
          take: 1,
        },
      },
    });

    const version = definition?.versions[0];
    if (!version) {
      throw new WorkflowSuspendedException('No approved workflow version found for service');
    }

    return version;
  }
}
