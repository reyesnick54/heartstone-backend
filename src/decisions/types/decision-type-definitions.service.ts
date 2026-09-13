import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DecisionCatalogBoundaryService } from '../common/decision-catalog-boundary.service';
import { DecisionCatalogValidationService } from '../common/decision-catalog-validation.service';
import { DECISIONS_EXPLANATION_CODES } from '../decisions.constants';
import { CreateDecisionTypeDto } from './dto/create-decision-type.dto';
import { DecisionTypeResponseDto } from './dto/decision-type-response.dto';

@Injectable()
export class DecisionTypeDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: DecisionCatalogValidationService,
    private readonly boundary: DecisionCatalogBoundaryService,
  ) {}

  async create(dto: CreateDecisionTypeDto): Promise<DecisionTypeResponseDto> {
    this.validation.assertClientCannotSetLifecycleStatus(dto as unknown as Record<string, unknown>);
    await this.validation.ensureInstitutionExists(dto.responsibleInstitutionId);

    if (dto.responsibleDepartmentId) {
      await this.validation.ensureDepartmentBelongsToInstitution(
        dto.responsibleDepartmentId,
        dto.responsibleInstitutionId,
      );
    }

    try {
      const created = await this.prisma.decisionTypeDefinition.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          responsibleInstitutionId: dto.responsibleInstitutionId,
          responsibleDepartmentId: dto.responsibleDepartmentId,
          governingSourceId: dto.governingSourceId,
          governmentServiceId: dto.governmentServiceId,
        },
      });

      return this.toResponse(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          message: `Decision type code "${dto.code}" already exists`,
          code: DECISIONS_EXPLANATION_CODES.DECISION_TYPE_CODE_EXISTS,
        });
      }
      throw error;
    }
  }

  async findAll(): Promise<DecisionTypeResponseDto[]> {
    const definitions = await this.prisma.decisionTypeDefinition.findMany({
      orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
    });
    return definitions.map((definition) => this.toResponse(definition));
  }

  async findOne(id: string): Promise<DecisionTypeResponseDto> {
    const definition = await this.prisma.decisionTypeDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`Decision type definition with id "${id}" was not found`);
    }
    return this.toResponse(definition);
  }

  private toResponse(
    definition: Prisma.DecisionTypeDefinitionGetPayload<Record<string, never>>,
  ): DecisionTypeResponseDto {
    return {
      id: definition.id,
      code: definition.code,
      name: definition.name,
      description: definition.description,
      responsibleInstitutionId: definition.responsibleInstitutionId,
      responsibleDepartmentId: definition.responsibleDepartmentId,
      status: definition.status,
      governingSourceId: definition.governingSourceId,
      governmentServiceId: definition.governmentServiceId,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
  }
}
