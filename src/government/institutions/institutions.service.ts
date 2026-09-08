import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Institution, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { QueryInstitutionsDto } from './dto/query-institutions.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateInstitutionDto): Promise<Institution> {
    await this.validation.ensureJurisdictionExists(dto.jurisdictionId);
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto): Promise<Institution> {
    await this.ensureJurisdictionExists(dto.jurisdictionId);

    try {
      return await this.prisma.institution.create({
        data: {
          jurisdictionId: dto.jurisdictionId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          status: dto.status,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.jurisdictionId, dto.code);
    }
  }

  async findAll(query: QueryInstitutionsDto): Promise<Institution[]> {
    const where: Prisma.InstitutionWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.jurisdictionId !== undefined) {
      where.jurisdictionId = query.jurisdictionId;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    return this.prisma.institution.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Institution> {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with id "${id}" was not found`);
    }

    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto): Promise<Institution> {
    await this.findOne(id);

    return this.prisma.institution.update({
      where: { id },
      data: dto,
    });
  }

  private async ensureJurisdictionExists(jurisdictionId: string): Promise<void> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id: jurisdictionId },
      select: { id: true },
    });

    if (!jurisdiction) {
      throw new NotFoundException(`Jurisdiction with id "${jurisdictionId}" was not found`);
    }
  }

  private handleWriteError(error: unknown, jurisdictionId: string, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Institution with code "${code}" already exists in jurisdiction "${jurisdictionId}"`,
      );
    }

    throw error;
  }
}
