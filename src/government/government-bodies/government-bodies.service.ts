import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentBody, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateGovernmentBodyDto } from './dto/create-government-body.dto';
import { QueryGovernmentBodiesDto } from './dto/query-government-bodies.dto';
import { UpdateGovernmentBodyDto } from './dto/update-government-body.dto';

@Injectable()
export class GovernmentBodiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateGovernmentBodyDto): Promise<GovernmentBody> {
    await this.validation.ensureInstitutionExists(dto.institutionId);

    try {
      return await this.prisma.governmentBody.create({
        data: {
          institutionId: dto.institutionId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          status: dto.status,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.code);
    }
  }

  async findAll(query: QueryGovernmentBodiesDto): Promise<GovernmentBody[]> {
    const where: Prisma.GovernmentBodyWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.institutionId !== undefined) {
      where.institutionId = query.institutionId;
    }

    return this.prisma.governmentBody.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<GovernmentBody> {
    const record = await this.prisma.governmentBody.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`GovernmentBody with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateGovernmentBodyDto): Promise<GovernmentBody> {
    await this.findOne(id);

    return this.prisma.governmentBody.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `GovernmentBody with code "${code}" already exists for the parent scope`,
      );
    }

    throw error;
  }
}
