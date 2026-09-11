import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GoverningSource, GoverningSourceStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashContent } from '../common/authority-hash.util';
import { AuthenticateGoverningSourceDto } from './dto/authenticate-governing-source.dto';
import { CreateGoverningSourceDto } from './dto/create-governing-source.dto';
import { GoverningSourceResponseDto } from './dto/governing-source-response.dto';

@Injectable()
export class GoverningSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGoverningSourceDto): Promise<GoverningSourceResponseDto> {
    const contentHash = hashContent(dto.content);
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;

    const source = await this.prisma.governingSource.create({
      data: {
        code: dto.code,
        title: dto.title,
        versionLabel: dto.versionLabel,
        status: GoverningSourceStatus.DRAFT,
        effectiveFrom,
        effectiveUntil,
        contentHash,
        versions: {
          create: {
            versionLabel: dto.versionLabel,
            contentHash,
          },
        },
      },
    });

    return this.toResponse(source);
  }

  async authenticate(
    id: string,
    dto: AuthenticateGoverningSourceDto,
  ): Promise<GoverningSourceResponseDto> {
    const existing = await this.prisma.governingSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`GoverningSource "${id}" was not found`);
    }

    if (existing.status === GoverningSourceStatus.REVOKED) {
      throw new BadRequestException('Cannot authenticate a revoked governing source');
    }

    const source = await this.prisma.governingSource.update({
      where: { id },
      data: {
        status: GoverningSourceStatus.AUTHENTICATED,
        authenticatedAt: new Date(),
        authenticatedByIdentityId: dto.authenticatedByIdentityId,
      },
    });

    return this.toResponse(source);
  }

  async revoke(id: string): Promise<GoverningSourceResponseDto> {
    const existing = await this.prisma.governingSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`GoverningSource "${id}" was not found`);
    }

    const source = await this.prisma.governingSource.update({
      where: { id },
      data: {
        status: GoverningSourceStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    return this.toResponse(source);
  }

  async findOne(id: string): Promise<GoverningSourceResponseDto> {
    const source = await this.prisma.governingSource.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`GoverningSource "${id}" was not found`);
    }
    return this.toResponse(source);
  }

  async findAll(query?: { status?: GoverningSourceStatus }): Promise<GoverningSourceResponseDto[]> {
    const where: Prisma.GoverningSourceWhereInput = {};
    if (query?.status) {
      where.status = query.status;
    }

    const sources = await this.prisma.governingSource.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    return sources.map((source) => this.toResponse(source));
  }

  toResponse(source: GoverningSource): GoverningSourceResponseDto {
    return {
      id: source.id,
      code: source.code,
      title: source.title,
      versionLabel: source.versionLabel,
      status: source.status,
      effectiveFrom: source.effectiveFrom,
      effectiveUntil: source.effectiveUntil,
      contentHash: source.contentHash,
      authenticatedAt: source.authenticatedAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}
