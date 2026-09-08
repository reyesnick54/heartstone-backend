import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Department, Prisma } from '@prisma/client';

import { handlePrismaUniqueConstraint } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    await this.ensureInstitutionExists(dto.institutionId);

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
      handlePrismaUniqueConstraint(
        error,
        `Department code '${dto.code}' already exists in institution '${dto.institutionId}'`,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Institution '${dto.institutionId}' does not exist`);
      }

      throw error;
    }
  }

  async findAll(query: ListDepartmentsQueryDto): Promise<Department[]> {
    const where: Prisma.DepartmentWhereInput = {};

    if (query.institutionId) {
      where.institutionId = query.institutionId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.department.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Department> {
    const department = await this.prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundException(`Department '${id}' not found`);
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    await this.findById(id);

    try {
      return await this.prisma.department.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Department '${id}' not found`);
      }

      throw error;
    }
  }

  private async ensureInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new BadRequestException(`Institution '${institutionId}' does not exist`);
    }
  }
}
