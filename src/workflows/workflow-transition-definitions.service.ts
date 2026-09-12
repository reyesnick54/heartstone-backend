import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkflowTransitionType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { assertSafeConditionStructure } from './common/workflow-condition-validation.util';
import { CreateWorkflowTransitionDto } from './dto/create-workflow-transition.dto';
import { WorkflowVersionsService } from './workflow-versions.service';

@Injectable()
export class WorkflowTransitionDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versionsService: WorkflowVersionsService,
  ) {}

  async create(workflowVersionId: string, dto: CreateWorkflowTransitionDto) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      select: { id: true, status: true },
    });

    if (!version) {
      throw new NotFoundException(`Workflow version with id "${workflowVersionId}" was not found`);
    }

    this.versionsService.assertVersionMutable(version.status);

    const [fromStep, toStep] = await Promise.all([
      this.prisma.workflowStepDefinition.findFirst({
        where: { id: dto.fromStepId, workflowVersionId },
        select: { id: true },
      }),
      this.prisma.workflowStepDefinition.findFirst({
        where: { id: dto.toStepId, workflowVersionId },
        select: { id: true },
      }),
    ]);

    if (!fromStep) {
      throw new BadRequestException(
        `fromStepId "${dto.fromStepId}" does not belong to workflow version "${workflowVersionId}"`,
      );
    }

    if (!toStep) {
      throw new BadRequestException(
        `toStepId "${dto.toStepId}" does not belong to workflow version "${workflowVersionId}"`,
      );
    }

    if (dto.fromStepId === dto.toStepId) {
      throw new BadRequestException('Transition cannot connect a step to itself');
    }

    assertSafeConditionStructure(dto.conditionConfig, 'conditionConfig');

    return this.prisma.workflowTransitionDefinition.create({
      data: {
        workflowVersionId,
        fromStepId: dto.fromStepId,
        toStepId: dto.toStepId,
        transitionType: dto.transitionType ?? WorkflowTransitionType.NORMAL,
        conditionConfig: (dto.conditionConfig ?? {}) as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
      },
    });
  }

  async findAllForVersion(workflowVersionId: string) {
    await this.ensureVersionExists(workflowVersionId);
    return this.prisma.workflowTransitionDefinition.findMany({
      where: { workflowVersionId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async ensureVersionExists(workflowVersionId: string): Promise<void> {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      select: { id: true },
    });
    if (!version) {
      throw new NotFoundException(`Workflow version with id "${workflowVersionId}" was not found`);
    }
  }
}
