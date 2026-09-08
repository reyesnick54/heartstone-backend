import { Injectable, NotFoundException } from '@nestjs/common';
import { Jurisdiction, Prisma } from '@prisma/client';

import { handlePrismaUniqueConstraint } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { ListJurisdictionsQueryDto } from './dto/list-jurisdictions-query.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';

@Injectable()
export class JurisdictionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJurisdictionDto): Promise<Jurisdiction> {
    try {
      return await this.prisma.jurisdiction.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          status: dto.status,
        },
      });
    } catch (error) {
      handlePrismaUniqueConstraint(error, `Jurisdiction code '${dto.code}' already exists`);
      throw error;
    }
  }

  async findAll(query: ListJurisdictionsQueryDto): Promise<Jurisdiction[]> {
    const where: Prisma.JurisdictionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.jurisdiction.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Jurisdiction> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({ where: { id } });

    if (!jurisdiction) {
      throw new NotFoundException(`Jurisdiction '${id}' not found`);
    }

    return jurisdiction;
  }

  async update(id: string, dto: UpdateJurisdictionDto): Promise<Jurisdiction> {
    await this.findById(id);

    try {
      return await this.prisma.jurisdiction.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Jurisdiction '${id}' not found`);
      }

      throw error;
    }
  }

  async ensureExists(id: string): Promise<Jurisdiction> {
    return this.findById(id);
  }
}
