import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ExternalAuthority, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateExternalAuthorityDto } from './dto/create-external-authority.dto';
import { ExternalAuthorityResponseDto } from './dto/external-authority-response.dto';
import { QueryExternalAuthoritiesDto } from './dto/query-external-authorities.dto';
import { UpdateExternalAuthorityDto } from './dto/update-external-authority.dto';

@Injectable()
export class ExternalAuthoritiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExternalAuthorityDto): Promise<ExternalAuthorityResponseDto> {
    try {
      return await this.prisma.externalAuthority.create({
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

  async findAll(query: QueryExternalAuthoritiesDto): Promise<ExternalAuthorityResponseDto[]> {
    const where: Prisma.ExternalAuthorityWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    return this.prisma.externalAuthority.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<ExternalAuthorityResponseDto> {
    const record = await this.prisma.externalAuthority.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`External authority with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateExternalAuthorityDto): Promise<ExternalAuthority> {
    await this.findOne(id);

    return this.prisma.externalAuthority.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(`External authority with code "${code}" already exists`);
    }

    throw error;
  }
}
