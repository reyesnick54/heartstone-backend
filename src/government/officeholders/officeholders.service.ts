import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Officeholder, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateOfficeholderDto } from './dto/create-officeholder.dto';
import { QueryOfficeholdersDto } from './dto/query-officeholders.dto';
import { UpdateOfficeholderDto } from './dto/update-officeholder.dto';

@Injectable()
export class OfficeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfficeholderDto): Promise<Officeholder> {
    try {
      return await this.prisma.officeholder.create({
        data: {
          referenceCode: dto.referenceCode,
          displayName: dto.displayName,
          givenName: dto.givenName,
          familyName: dto.familyName,
          titlePrefix: dto.titlePrefix,
          titleSuffix: dto.titleSuffix,
          status: dto.status,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.referenceCode);
    }
  }

  async findAll(query: QueryOfficeholdersDto): Promise<Officeholder[]> {
    const where: Prisma.OfficeholderWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    return this.prisma.officeholder.findMany({
      where,
      orderBy: [{ displayName: 'asc' }, { referenceCode: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Officeholder> {
    const officeholder = await this.prisma.officeholder.findUnique({
      where: { id },
    });

    if (!officeholder) {
      throw new NotFoundException(`Officeholder with id "${id}" was not found`);
    }

    return officeholder;
  }

  async update(id: string, dto: UpdateOfficeholderDto): Promise<Officeholder> {
    await this.findOne(id);

    return this.prisma.officeholder.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, referenceCode: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Officeholder with referenceCode "${referenceCode}" already exists`,
      );
    }

    throw error;
  }
}
