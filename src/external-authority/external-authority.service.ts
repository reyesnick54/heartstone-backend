import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ExternalAuthority, Prisma, RecordStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateExternalAuthorityDto } from './dto/create-external-authority.dto';
import { ListExternalAuthoritiesQueryDto } from './dto/list-external-authorities-query.dto';
import { UpdateExternalAuthorityDto } from './dto/update-external-authority.dto';

@Injectable()
export class ExternalAuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExternalAuthorityDto): Promise<ExternalAuthority> {
    try {
      return await this.prisma.externalAuthority.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          jurisdictionDescription: dto.jurisdictionDescription,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`External authority with code '${dto.code}' already exists`);
      }

      throw error;
    }
  }

  async findAll(query: ListExternalAuthoritiesQueryDto): Promise<ExternalAuthority[]> {
    return this.prisma.externalAuthority.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: string): Promise<ExternalAuthority> {
    const authority = await this.prisma.externalAuthority.findUnique({
      where: { id },
    });

    if (!authority) {
      throw new NotFoundException(`External authority '${id}' not found`);
    }

    return authority;
  }

  async update(id: string, dto: UpdateExternalAuthorityDto): Promise<ExternalAuthority> {
    await this.findById(id);

    return this.prisma.externalAuthority.update({
      where: { id },
      data: dto,
    });
  }

  async assertExists(id: string): Promise<ExternalAuthority> {
    return this.findById(id);
  }

  async assertActive(id: string): Promise<ExternalAuthority> {
    const authority = await this.findById(id);

    if (authority.status !== RecordStatus.ACTIVE) {
      throw new NotFoundException(`External authority '${id}' not found`);
    }

    return authority;
  }
}
