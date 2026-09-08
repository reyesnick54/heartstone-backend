import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Department, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    await this.validation.ensureInstitutionExists(dto.institutionId);

    try {
      return await this.prisma.department.create({
        data: {
          institutionId: dto.institutionId,
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

  async findAll(query: QueryDepartmentsDto): Promise<Department[]> {
    const where: Prisma.DepartmentWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.institutionId !== undefined) {
      where.institutionId = query.institutionId;
    }

    return this.prisma.department.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Department> {
    const record = await this.prisma.department.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Department with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Department with code "${code}" already exists for the parent scope`,
      );
    }

    throw error;
  }
}
