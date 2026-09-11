import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FunctionAuthorityRecord, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AuthorityValidationService } from '../common/authority-validation.service';
import { CreateFunctionAuthorityRecordDto } from './dto/create-function-authority-record.dto';
import { QueryFunctionAuthorityRecordsDto } from './dto/function-authority-record.dto';
import { UpdateFunctionAuthorityRecordDto } from './dto/update-function-authority-record.dto';

@Injectable()
export class FunctionAuthorityRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: AuthorityValidationService,
  ) {}

  async create(dto: CreateFunctionAuthorityRecordDto): Promise<FunctionAuthorityRecord> {
    await this.validation.ensureInstitutionExists(dto.institutionId);

    if (dto.departmentId !== undefined) {
      await this.validation.ensureDepartmentBelongsToInstitution(
        dto.departmentId,
        dto.institutionId,
      );
    }

    try {
      return await this.prisma.functionAuthorityRecord.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          functionClass: dto.functionClass,
          authorityClassification: dto.authorityClassification,
          lifecycleState: dto.lifecycleState,
          institutionId: dto.institutionId,
          departmentId: dto.departmentId,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
          effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
          revalidationAt: dto.revalidationAt ? new Date(dto.revalidationAt) : undefined,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.code);
    }
  }

  async findAll(query: QueryFunctionAuthorityRecordsDto): Promise<FunctionAuthorityRecord[]> {
    const where: Prisma.FunctionAuthorityRecordWhereInput = {};

    if (query.lifecycleState !== undefined) {
      where.lifecycleState = query.lifecycleState;
    }

    if (query.authorityClassification !== undefined) {
      where.authorityClassification = query.authorityClassification;
    }

    if (query.functionClass !== undefined) {
      where.functionClass = query.functionClass;
    }

    if (query.institutionId !== undefined) {
      where.institutionId = query.institutionId;
    }

    if (query.departmentId !== undefined) {
      where.departmentId = query.departmentId;
    }

    return this.prisma.functionAuthorityRecord.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<FunctionAuthorityRecord> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Function authority record with id "${id}" was not found`);
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecord> {
    const existing = await this.findOne(id);

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.validation.ensureDepartmentBelongsToInstitution(
        dto.departmentId,
        existing.institutionId,
      );
    }

    return this.prisma.functionAuthorityRecord.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        functionClass: dto.functionClass,
        authorityClassification: dto.authorityClassification,
        lifecycleState: dto.lifecycleState,
        departmentId: dto.departmentId,
        effectiveFrom:
          dto.effectiveFrom === null
            ? null
            : dto.effectiveFrom !== undefined
              ? new Date(dto.effectiveFrom)
              : undefined,
        effectiveUntil:
          dto.effectiveUntil === null
            ? null
            : dto.effectiveUntil !== undefined
              ? new Date(dto.effectiveUntil)
              : undefined,
        revalidationAt:
          dto.revalidationAt === null
            ? null
            : dto.revalidationAt !== undefined
              ? new Date(dto.revalidationAt)
              : undefined,
      },
    });
  }

  private handleWriteError(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(`Function authority record with code "${code}" already exists`);
    }

    throw error;
  }
}
