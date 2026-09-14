import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationDefinition, IntegrationDefinitionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { IntegrationsValidationService } from '../common/integrations-validation.service';
import { CreateIntegrationDefinitionDto } from '../dto/create-integration-definition.dto';
import { UpdateIntegrationDefinitionDto } from '../dto/update-integration-definition.dto';

@Injectable()
export class IntegrationDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IntegrationsValidationService,
    private readonly boundary: IntegrationsBoundaryService,
  ) {}

  async create(dto: CreateIntegrationDefinitionDto): Promise<IntegrationDefinition> {
    this.boundary.rejectForbiddenDefinitionFields(dto as unknown as Record<string, unknown>);
    this.boundary.assertSystemOwnershipNotInstitutionalAuthority(
      dto.systemOwner,
      dto.institutionalOwnerId,
    );

    await this.validation.ensureInstitutionExists(dto.institutionalOwnerId);

    try {
      return await this.prisma.integrationDefinition.create({
        data: {
          integrationCode: dto.integrationCode,
          officialName: dto.officialName,
          description: dto.description,
          institutionalOwnerId: dto.institutionalOwnerId,
          systemOwner: dto.systemOwner,
          provider: dto.provider,
          dependencyCategory: dto.dependencyCategory,
          businessPurpose: dto.businessPurpose,
          status: IntegrationDefinitionStatus.DRAFT,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.integrationCode);
    }
  }

  async findAll(query?: {
    institutionalOwnerId?: string;
    status?: IntegrationDefinitionStatus;
  }): Promise<IntegrationDefinition[]> {
    const where: Prisma.IntegrationDefinitionWhereInput = {};

    if (query?.institutionalOwnerId) {
      where.institutionalOwnerId = query.institutionalOwnerId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    return this.prisma.integrationDefinition.findMany({
      where,
      orderBy: [{ officialName: 'asc' }, { integrationCode: 'asc' }],
    });
  }

  async findOne(id: string): Promise<IntegrationDefinition> {
    const record = await this.prisma.integrationDefinition.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Integration definition with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateIntegrationDefinitionDto): Promise<IntegrationDefinition> {
    this.boundary.rejectForbiddenDefinitionFields(dto as unknown as Record<string, unknown>);
    const existing = await this.findOne(id);

    if (dto.institutionalOwnerId !== undefined) {
      await this.validation.ensureInstitutionExists(dto.institutionalOwnerId);
    }

    const systemOwner = dto.systemOwner ?? existing.systemOwner;
    const institutionalOwnerId = dto.institutionalOwnerId ?? existing.institutionalOwnerId;
    this.boundary.assertSystemOwnershipNotInstitutionalAuthority(
      systemOwner,
      institutionalOwnerId,
    );

    return this.prisma.integrationDefinition.update({
      where: { id },
      data: dto,
    });
  }

  async register(id: string): Promise<IntegrationDefinition> {
    const existing = await this.findOne(id);

    if (existing.status !== IntegrationDefinitionStatus.DRAFT) {
      throw new ConflictException('Only draft integration definitions can be registered');
    }

    return this.prisma.integrationDefinition.update({
      where: { id },
      data: { status: IntegrationDefinitionStatus.REGISTERED },
    });
  }

  async suspend(id: string): Promise<IntegrationDefinition> {
    await this.findOne(id);

    return this.prisma.integrationDefinition.update({
      where: { id },
      data: { status: IntegrationDefinitionStatus.SUSPENDED },
    });
  }

  private handleWriteError(error: unknown, integrationCode: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Integration definition with code "${integrationCode}" already exists`,
      );
    }

    throw error;
  }
}
