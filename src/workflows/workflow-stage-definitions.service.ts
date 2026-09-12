import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { assertSafeConditionStructure } from './common/workflow-condition-validation.util';
import { CreateWorkflowStageDto } from './dto/create-workflow-stage.dto';
import { WorkflowVersionsService } from './workflow-versions.service';

@Injectable()
export class WorkflowStageDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versionsService: WorkflowVersionsService,
  ) {}

  async create(workflowVersionId: string, dto: CreateWorkflowStageDto) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      select: { id: true, status: true },
    });

    if (!version) {
      throw new NotFoundException(`Workflow version with id "${workflowVersionId}" was not found`);
    }

    this.versionsService.assertVersionMutable(version.status);
    this.validateRules(dto.entryRules, 'entryRules');
    this.validateRules(dto.completionRules, 'completionRules');

    try {
      return await this.prisma.workflowStageDefinition.create({
        data: {
          workflowVersionId,
          stageKey: dto.stageKey,
          name: dto.name,
          sequence: dto.sequence,
          stageType: dto.stageType,
          description: dto.description,
          entryRules: (dto.entryRules ?? {}) as Prisma.InputJsonValue,
          completionRules: (dto.completionRules ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(`Stage key "${dto.stageKey}" already exists in this version`);
      }
      throw error;
    }
  }

  async findAllForVersion(workflowVersionId: string) {
    await this.ensureVersionExists(workflowVersionId);
    return this.prisma.workflowStageDefinition.findMany({
      where: { workflowVersionId },
      orderBy: { sequence: 'asc' },
    });
  }

  private validateRules(rules: Record<string, unknown> | undefined, field: string): void {
    if (rules) {
      assertSafeConditionStructure(rules, field);
    }
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
