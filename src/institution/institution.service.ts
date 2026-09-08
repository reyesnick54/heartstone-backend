import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Institution, Prisma } from '@prisma/client';

import { handlePrismaUniqueConstraint } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { ListInstitutionsQueryDto } from './dto/list-institutions-query.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Institution, Prisma, StructuralLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class InstitutionService {
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
          status: dto.status,
        },
      });
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        `Institution code '${dto.code}' already exists in jurisdiction '${dto.jurisdictionId}'`,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Jurisdiction '${dto.jurisdictionId}' does not exist`);
      }

      throw error;
    }
  }

  async findAll(query: ListInstitutionsQueryDto): Promise<Institution[]> {
    const where: Prisma.InstitutionWhereInput = {};

    if (query.jurisdictionId) {
      where.jurisdictionId = query.jurisdictionId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.institution.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Institution> {
    const institution = await this.prisma.institution.findUnique({ where: { id } });

    if (!institution) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto): Promise<Institution> {
    await this.findById(id);

    try {
      return await this.prisma.institution.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
  async findById(id: string): Promise<Institution> {
    if (!UUID_PATTERN.test(id)) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    try {
      const institution = await this.prisma.institution.findUnique({
        where: { id },
      });

      if (!institution) {
        throw new NotFoundException(`Institution '${id}' not found`);
      }

      return institution;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2023'
      ) {
        throw new NotFoundException(`Institution '${id}' not found`);
      }

      throw error;
    }
  }

  async ensureExists(id: string): Promise<Institution> {
    return this.findById(id);
  }

  private async ensureJurisdictionExists(jurisdictionId: string): Promise<void> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id: jurisdictionId },
    });

    if (!jurisdiction) {
      throw new BadRequestException(`Jurisdiction '${jurisdictionId}' does not exist`);
    }
  async assertActive(id: string): Promise<Institution> {
    const institution = await this.findById(id);

    if (institution.status !== StructuralLifecycleStatus.ACTIVE) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    return institution;
  }
}
