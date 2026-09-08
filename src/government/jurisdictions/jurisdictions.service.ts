import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Jurisdiction, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { QueryJurisdictionsDto } from './dto/query-jurisdictions.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';

@Injectable()
export class JurisdictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJurisdictionDto): Promise<Jurisdiction> {
    try {
      return await this.prisma.jurisdiction.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          status: dto.status,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.code);
    }
  }

  async findAll(query: QueryJurisdictionsDto): Promise<Jurisdiction[]> {
    const where: Prisma.JurisdictionWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    return this.prisma.jurisdiction.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Jurisdiction> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id },
    });

    if (!jurisdiction) {
      throw new NotFoundException(`Jurisdiction with id "${id}" was not found`);
    }

    return jurisdiction;
  }

  async update(id: string, dto: UpdateJurisdictionDto): Promise<Jurisdiction> {
    await this.findOne(id);

    try {
      return await this.prisma.jurisdiction.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  private handleWriteError(error: unknown, code?: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        code
          ? `Jurisdiction with code "${code}" already exists`
          : 'Jurisdiction with the same code already exists',
      );
    }

    throw error;
  }
}
