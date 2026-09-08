import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Officeholder, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateOfficeholderDto } from './dto/create-officeholder.dto';
import { QueryOfficeholdersDto } from './dto/query-officeholders.dto';
import { UpdateOfficeholderDto } from './dto/update-officeholder.dto';

@Injectable()
export class OfficeholdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateOfficeholderDto): Promise<Officeholder> {
    try {
      return await this.prisma.officeholder.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          status: dto.status,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.code);
    }
  }

  async findAll(query: QueryOfficeholdersDto): Promise<Officeholder[]> {
    const where: Prisma.OfficeholderWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    return this.prisma.officeholder.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Officeholder> {
    const record = await this.prisma.officeholder.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Officeholder with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateOfficeholderDto): Promise<Officeholder> {
    await this.findOne(id);

    return this.prisma.officeholder.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(`Officeholder with code "${code}" already exists`);
    }

    throw error;
  }
}
