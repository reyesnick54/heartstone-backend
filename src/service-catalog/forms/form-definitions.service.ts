import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FormDefinition, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';

@Injectable()
export class FormDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFormDefinitionDto): Promise<FormDefinition> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: dto.governmentServiceVersionId },
    });

    if (!serviceVersion) {
      throw new NotFoundException(
        `GovernmentServiceVersion "${dto.governmentServiceVersionId}" was not found`,
      );
    }

    try {
      return await this.prisma.formDefinition.create({
        data: {
          code: dto.code,
          name: dto.name,
          purpose: dto.purpose,
          governmentServiceVersionId: dto.governmentServiceVersionId,
          status: dto.status,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`FormDefinition with code "${dto.code}" already exists`);
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<FormDefinition> {
    const definition = await this.prisma.formDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`FormDefinition "${id}" was not found`);
    }
    return definition;
  }

  async findByCode(code: string): Promise<FormDefinition> {
    const definition = await this.prisma.formDefinition.findUnique({ where: { code } });
    if (!definition) {
      throw new NotFoundException(`FormDefinition with code "${code}" was not found`);
    }
    return definition;
  }

  async findAll(query?: { governmentServiceVersionId?: string }): Promise<FormDefinition[]> {
    const where: Prisma.FormDefinitionWhereInput = {};
    if (query?.governmentServiceVersionId) {
      where.governmentServiceVersionId = query.governmentServiceVersionId;
    }

    return this.prisma.formDefinition.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }
}
