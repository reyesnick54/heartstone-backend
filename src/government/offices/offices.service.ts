import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Office, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { QueryOfficesDto } from './dto/query-offices.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfficeDto): Promise<Office> {
    await this.ensureDepartmentExists(dto.departmentId);

    try {
      return await this.prisma.office.create({
        data: {
          departmentId: dto.departmentId,
          code: dto.code,
          title: dto.title,
          description: dto.description,
          status: dto.status,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.departmentId, dto.code);
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
      orderBy: [{ title: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Office> {
    const office = await this.prisma.office.findUnique({
      where: { id },
    });

    if (!office) {
      throw new NotFoundException(`Office with id "${id}" was not found`);
    }

    return office;
  }

  async update(id: string, dto: UpdateOfficeDto): Promise<Office> {
    await this.findOne(id);

    return this.prisma.office.update({
      where: { id },
      data: dto,
    });
  }

  private async ensureDepartmentExists(departmentId: string): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(`Department with id "${departmentId}" was not found`);
    }
  }

  private handleWriteError(error: unknown, departmentId: string, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Office with code "${code}" already exists in department "${departmentId}"`,
      );
    }

    throw error;
  }
}
