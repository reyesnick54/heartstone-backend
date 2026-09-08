import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentBody, Prisma } from '@prisma/client';

import { handlePrismaUniqueConstraint } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { CreateGovernmentBodyDto } from './dto/create-government-body.dto';
import { ListGovernmentBodiesQueryDto } from './dto/list-government-bodies-query.dto';
import { UpdateGovernmentBodyDto } from './dto/update-government-body.dto';

@Injectable()
export class GovernmentBodyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGovernmentBodyDto): Promise<GovernmentBody> {
    await this.ensureInstitutionExists(dto.institutionId);

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
      handlePrismaUniqueConstraint(
        error,
        `GovernmentBody code '${dto.code}' already exists in institution '${dto.institutionId}'`,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Institution '${dto.institutionId}' does not exist`);
      }

      throw error;
    }
  }

  async findAll(query: ListGovernmentBodiesQueryDto): Promise<GovernmentBody[]> {
    const where: Prisma.GovernmentBodyWhereInput = {};

    if (query.institutionId) {
      where.institutionId = query.institutionId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    return this.prisma.governmentBody.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<GovernmentBody> {
    const governmentBody = await this.prisma.governmentBody.findUnique({ where: { id } });

    if (!governmentBody) {
      throw new NotFoundException(`GovernmentBody '${id}' not found`);
    }

    return governmentBody;
  }

  async update(id: string, dto: UpdateGovernmentBodyDto): Promise<GovernmentBody> {
    await this.findById(id);

    try {
      return await this.prisma.governmentBody.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`GovernmentBody '${id}' not found`);
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
