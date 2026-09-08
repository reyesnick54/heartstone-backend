import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Office, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { QueryOfficesDto } from './dto/query-offices.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

@Injectable()
export class OfficesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateOfficeDto): Promise<Office> {
    await this.validation.ensureDepartmentExists(dto.departmentId);

    try {
      return await this.prisma.office.create({
        data: {
          departmentId: dto.departmentId,
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

  async findAll(query: QueryOfficesDto): Promise<Office[]> {
    const where: Prisma.OfficeWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.departmentId !== undefined) {
      where.departmentId = query.departmentId;
    }

    return this.prisma.office.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Office> {
    const record = await this.prisma.office.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Office with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateOfficeDto): Promise<Office> {
    await this.findOne(id);

    return this.prisma.office.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(`Office with code "${code}" already exists for the parent scope`);
    }

    throw error;
  }
}
