import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowDefinitionResponseDto } from './dto/workflow-definition-response.dto';

@Injectable()
export class WorkflowDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkflowDefinitionDto): Promise<WorkflowDefinitionResponseDto> {
    const service = await this.prisma.governmentService.findUnique({
      where: { id: dto.serviceId },
      select: { id: true, responsibleDepartmentId: true },
    });

    if (!service) {
      throw new NotFoundException(`Government service with id "${dto.serviceId}" was not found`);
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.responsibleDepartmentId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(
        `Department with id "${dto.responsibleDepartmentId}" was not found`,
      );
    }

    if (dto.institutionalOwnerOfficeId) {
      const office = await this.prisma.office.findUnique({
        where: { id: dto.institutionalOwnerOfficeId },
        select: { id: true },
      });
      if (!office) {
        throw new NotFoundException(
          `Office with id "${dto.institutionalOwnerOfficeId}" was not found`,
        );
      }
    }

    try {
      const definition = await this.prisma.workflowDefinition.create({
        data: {
          code: dto.code,
          name: dto.name,
          governmentServiceId: dto.serviceId,
          responsibleDepartmentId: dto.responsibleDepartmentId,
          institutionalOwnerOfficeId: dto.institutionalOwnerOfficeId,
          description: dto.description,
        },
      });

      return this.toResponse(definition);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Workflow definition with code "${dto.code}" already exists`);
      }
      throw error;
    }
  }

  async findAll(): Promise<WorkflowDefinitionResponseDto[]> {
    const definitions = await this.prisma.workflowDefinition.findMany({
      orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
    });
    return definitions.map((definition) => this.toResponse(definition));
  }

  async findOne(id: string): Promise<WorkflowDefinitionResponseDto> {
    const definition = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`Workflow definition with id "${id}" was not found`);
    }
    return this.toResponse(definition);
  }

  async update(id: string, dto: UpdateWorkflowDefinitionDto): Promise<WorkflowDefinitionResponseDto> {
    await this.findOne(id);

    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: dto,
    });

    return this.toResponse(updated);
  }

  private toResponse(definition: {
    id: string;
    code: string;
    name: string;
    governmentServiceId: string;
    responsibleDepartmentId: string;
    institutionalOwnerOfficeId: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowDefinitionResponseDto {
    return {
      id: definition.id,
      code: definition.code,
      name: definition.name,
      serviceId: definition.governmentServiceId,
      responsibleDepartmentId: definition.responsibleDepartmentId,
      institutionalOwnerOfficeId: definition.institutionalOwnerOfficeId,
      description: definition.description,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
  }
}
