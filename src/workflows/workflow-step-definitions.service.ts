import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { assertSafeConditionStructure } from './common/workflow-condition-validation.util';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto';
import { WorkflowVersionsService } from './workflow-versions.service';

@Injectable()
export class WorkflowStepDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versionsService: WorkflowVersionsService,
  ) {}

  async create(workflowVersionId: string, dto: CreateWorkflowStepDto) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      select: { id: true, status: true },
    });

    if (!version) {
      throw new NotFoundException(`Workflow version with id "${workflowVersionId}" was not found`);
    }

    this.versionsService.assertVersionMutable(version.status);

    const stage = await this.prisma.workflowStageDefinition.findFirst({
      where: { id: dto.stageId, workflowVersionId },
      select: { id: true },
    });

    if (!stage) {
      throw new BadRequestException(
        `Stage "${dto.stageId}" does not belong to workflow version "${workflowVersionId}"`,
      );
    }

    if (dto.functionAuthorityRecordId) {
      const authority = await this.prisma.functionAuthorityRecord.findUnique({
        where: { id: dto.functionAuthorityRecordId },
        select: { id: true },
      });
      if (!authority) {
        throw new NotFoundException(
          `FunctionAuthorityRecord "${dto.functionAuthorityRecordId}" was not found`,
        );
      }
    }

    this.validateConfigurations(dto);

    try {
      return await this.prisma.workflowStepDefinition.create({
        data: {
          workflowVersionId,
          stageId: dto.stageId,
          stepKey: dto.stepKey,
          name: dto.name,
          stepType: dto.stepType,
          sequence: dto.sequence,
          responsibleDepartmentId: dto.responsibleDepartmentId,
          responsibleOfficeId: dto.responsibleOfficeId,
          functionAuthorityRecordId: dto.functionAuthorityRecordId,
          requiredAuthorityAction: dto.requiredAuthorityAction,
          requiredEvidence: (dto.requiredEvidence ?? []) as Prisma.InputJsonValue,
          routingConfiguration: (dto.routingConfiguration ?? {}) as Prisma.InputJsonValue,
          deadlineConfiguration: (dto.deadlineConfiguration ?? {}) as Prisma.InputJsonValue,
          pauseConfiguration: (dto.pauseConfiguration ?? {}) as Prisma.InputJsonValue,
          escalationConfiguration: (dto.escalationConfiguration ?? {}) as Prisma.InputJsonValue,
          safeHaltConfiguration: (dto.safeHaltConfiguration ?? {}) as Prisma.InputJsonValue,
          manualAllowed: dto.manualAllowed ?? true,
          isConsequential: dto.isConsequential ?? false,
          isStartingStep: dto.isStartingStep ?? false,
          parallelForkGroupKey: dto.parallelForkGroupKey,
          parallelJoinGroupKey: dto.parallelJoinGroupKey,
          permitsCycle: dto.permitsCycle ?? false,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(`Step key "${dto.stepKey}" already exists in this version`);
      }
      throw error;
    }
  }

  async findAllForVersion(workflowVersionId: string) {
    await this.ensureVersionExists(workflowVersionId);
    return this.prisma.workflowStepDefinition.findMany({
      where: { workflowVersionId },
      orderBy: { sequence: 'asc' },
      include: { stage: true },
    });
  }

  private validateConfigurations(dto: CreateWorkflowStepDto): void {
    assertSafeConditionStructure(dto.routingConfiguration, 'routingConfiguration');
    assertSafeConditionStructure(dto.deadlineConfiguration, 'deadlineConfiguration');
    assertSafeConditionStructure(dto.pauseConfiguration, 'pauseConfiguration');
    assertSafeConditionStructure(dto.escalationConfiguration, 'escalationConfiguration');
    assertSafeConditionStructure(dto.safeHaltConfiguration, 'safeHaltConfiguration');
    assertSafeConditionStructure(dto.requiredEvidence, 'requiredEvidence');
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
