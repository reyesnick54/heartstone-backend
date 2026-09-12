import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkflowConsequenceLevel, WorkflowVersionStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import {
  CreateWorkflowVersionDto,
  UpdateWorkflowVersionDto,
} from './dto/create-workflow-version.dto';
import { WorkflowVersionResponseDto } from './dto/workflow-version-response.dto';
import { IMMUTABLE_WORKFLOW_VERSION_STATUSES } from './workflow.constants';

@Injectable()
export class WorkflowVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workflowDefinitionId: string,
    dto: CreateWorkflowVersionDto,
  ): Promise<WorkflowVersionResponseDto> {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: workflowDefinitionId },
      select: { id: true, governmentServiceId: true },
    });

    if (!definition) {
      throw new NotFoundException(
        `Workflow definition with id "${workflowDefinitionId}" was not found`,
      );
    }

    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: dto.serviceVersionId },
      select: { id: true, governmentServiceId: true },
    });

    if (!serviceVersion) {
      throw new NotFoundException(
        `Government service version with id "${dto.serviceVersionId}" was not found`,
      );
    }

    if (serviceVersion.governmentServiceId !== definition.governmentServiceId) {
      throw new BadRequestException(
        'Workflow version serviceVersionId must belong to the same government service as the workflow definition',
      );
    }

    const version = await this.prisma.workflowVersion.create({
      data: {
        workflowDefinitionId,
        version: dto.version,
        governmentServiceVersionId: dto.serviceVersionId,
        consequenceLevel: dto.consequenceLevel,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
        manualFallbackReference: dto.manualFallbackReference,
        entryConditions: (dto.entryConditions ?? {}) as Prisma.InputJsonValue,
        status: WorkflowVersionStatus.DRAFT,
      },
    });

    return this.toResponse(version);
  }

  async createNextVersion(
    workflowDefinitionId: string,
    dto: CreateWorkflowVersionDto,
  ): Promise<WorkflowVersionResponseDto> {
    const latestActive = await this.prisma.workflowVersion.findFirst({
      where: {
        workflowDefinitionId,
        status: WorkflowVersionStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestActive) {
      throw new BadRequestException('Cannot supersede without an existing ACTIVE workflow version');
    }

    const newVersion = await this.create(workflowDefinitionId, dto);

    await this.prisma.$transaction([
      this.prisma.workflowVersion.update({
        where: { id: latestActive.id },
        data: {
          status: WorkflowVersionStatus.SUPERSEDED,
          supersededByVersionId: newVersion.id,
        },
      }),
    ]);

    return newVersion;
  }

  async findAllForDefinition(workflowDefinitionId: string): Promise<WorkflowVersionResponseDto[]> {
    await this.ensureDefinitionExists(workflowDefinitionId);

    const versions = await this.prisma.workflowVersion.findMany({
      where: { workflowDefinitionId },
      orderBy: [{ createdAt: 'asc' }, { version: 'asc' }],
    });

    return versions.map((version) => this.toResponse(version));
  }

  async findOne(id: string): Promise<WorkflowVersionResponseDto> {
    const version = await this.prisma.workflowVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`Workflow version with id "${id}" was not found`);
    }
    return this.toResponse(version);
  }

  async reconstruct(id: string) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        steps: { orderBy: { sequence: 'asc' }, include: { stage: true } },
        transitions: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    if (!version) {
      throw new NotFoundException(`Workflow version with id "${id}" was not found`);
    }

    const response = this.toResponse(version);
    return {
      id: response.id,
      workflowDefinitionId: response.workflowDefinitionId,
      version: response.version,
      serviceVersionId: response.serviceVersionId,
      status: response.status,
      consequenceLevel: response.consequenceLevel,
      effectiveFrom: response.effectiveFrom,
      effectiveUntil: response.effectiveUntil,
      supersededByVersionId: response.supersededByVersionId,
      activationFunctionAuthorityRecordId: response.activationFunctionAuthorityRecordId,
      manualFallbackReference: response.manualFallbackReference,
      entryConditions: response.entryConditions,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      stages: version.stages,
      steps: version.steps.map((step) => ({
        id: step.id,
        workflowVersionId: step.workflowVersionId,
        stageId: step.stageId,
        stepKey: step.stepKey,
        name: step.name,
        stepType: step.stepType,
        sequence: step.sequence,
        responsibleDepartmentId: step.responsibleDepartmentId,
        responsibleOfficeId: step.responsibleOfficeId,
        functionAuthorityRecordId: step.functionAuthorityRecordId,
        requiredAuthorityAction: step.requiredAuthorityAction,
        requiredEvidence: step.requiredEvidence,
        routingConfiguration: step.routingConfiguration,
        deadlineConfiguration: step.deadlineConfiguration,
        pauseConfiguration: step.pauseConfiguration,
        escalationConfiguration: step.escalationConfiguration,
        safeHaltConfiguration: step.safeHaltConfiguration,
        manualAllowed: step.manualAllowed,
        isConsequential: step.isConsequential,
        isStartingStep: step.isStartingStep,
        parallelForkGroupKey: step.parallelForkGroupKey,
        parallelJoinGroupKey: step.parallelJoinGroupKey,
        permitsCycle: step.permitsCycle,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt,
        stageKey: step.stage.stageKey,
        stageType: step.stage.stageType,
      })),
      transitions: version.transitions,
    };
  }

  async update(id: string, dto: UpdateWorkflowVersionDto): Promise<WorkflowVersionResponseDto> {
    const existing = await this.prisma.workflowVersion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Workflow version with id "${id}" was not found`);
    }

    this.assertVersionMutable(existing.status);
    this.assertNoClientStatusMutation(dto);

    const updated = await this.prisma.workflowVersion.update({
      where: { id },
      data: {
        consequenceLevel: dto.consequenceLevel,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
        manualFallbackReference: dto.manualFallbackReference,
        entryConditions: dto.entryConditions as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toResponse(updated);
  }

  async markActiveForTesting(id: string): Promise<WorkflowVersionResponseDto> {
    const existing = await this.prisma.workflowVersion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Workflow version with id "${id}" was not found`);
    }

    if (existing.status !== WorkflowVersionStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT workflow versions can be marked ACTIVE for testing',
      );
    }

    const updated = await this.prisma.workflowVersion.update({
      where: { id },
      data: { status: WorkflowVersionStatus.ACTIVE },
    });

    return this.toResponse(updated);
  }

  assertVersionMutable(status: WorkflowVersionStatus): void {
    if (IMMUTABLE_WORKFLOW_VERSION_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Workflow version with status "${status}" is immutable and cannot be modified`,
      );
    }
  }

  private assertNoClientStatusMutation(dto: UpdateWorkflowVersionDto): void {
    const body = dto as Record<string, unknown>;
    for (const field of [
      'status',
      'supersededByVersionId',
      'activationFunctionAuthorityRecordId',
    ]) {
      if (field in body) {
        throw new BadRequestException(`Client-supplied "${field}" is not accepted`);
      }
    }
  }

  private async ensureDefinitionExists(workflowDefinitionId: string): Promise<void> {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: workflowDefinitionId },
      select: { id: true },
    });
    if (!definition) {
      throw new NotFoundException(
        `Workflow definition with id "${workflowDefinitionId}" was not found`,
      );
    }
  }

  private toResponse(version: {
    id: string;
    workflowDefinitionId: string;
    version: string;
    governmentServiceVersionId: string;
    status: WorkflowVersionStatus;
    consequenceLevel: WorkflowConsequenceLevel;
    effectiveFrom: Date | null;
    effectiveUntil: Date | null;
    supersededByVersionId: string | null;
    activationFunctionAuthorityRecordId: string | null;
    manualFallbackReference: string | null;
    entryConditions: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowVersionResponseDto {
    return {
      id: version.id,
      workflowDefinitionId: version.workflowDefinitionId,
      version: version.version,
      serviceVersionId: version.governmentServiceVersionId,
      status: version.status,
      consequenceLevel: version.consequenceLevel,
      effectiveFrom: version.effectiveFrom,
      effectiveUntil: version.effectiveUntil,
      supersededByVersionId: version.supersededByVersionId,
      activationFunctionAuthorityRecordId: version.activationFunctionAuthorityRecordId,
      manualFallbackReference: version.manualFallbackReference,
      entryConditions: (version.entryConditions ?? {}) as Record<string, unknown>,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
