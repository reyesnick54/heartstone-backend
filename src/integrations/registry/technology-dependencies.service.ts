import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TechnologyDependency } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateTechnologyDependencyDto } from '../dto/create-technology-dependency.dto';

@Injectable()
export class TechnologyDependenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTechnologyDependencyDto): Promise<TechnologyDependency> {
    try {
      return await this.prisma.technologyDependency.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          vendor: dto.vendor,
          versionLabel: dto.versionLabel,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Technology dependency with code "${dto.code}" already exists`);
      }

      throw error;
    }
  }

  async findAll(): Promise<TechnologyDependency[]> {
    return this.prisma.technologyDependency.findMany({
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<TechnologyDependency> {
    const record = await this.prisma.technologyDependency.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Technology dependency with id "${id}" was not found`);
    }

    return record;
  }
}
