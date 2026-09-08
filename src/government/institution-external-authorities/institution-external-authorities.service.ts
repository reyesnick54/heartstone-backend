import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstitutionExternalAuthority, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateInstitutionExternalAuthorityDto } from './dto/create-institution-external-authority.dto';
import { InstitutionExternalAuthorityResponseDto } from './dto/institution-external-authority-response.dto';
import { QueryInstitutionExternalAuthoritiesDto } from './dto/query-institution-external-authorities.dto';
import { UpdateInstitutionExternalAuthorityDto } from './dto/update-institution-external-authority.dto';

@Injectable()
export class InstitutionExternalAuthoritiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(
    dto: CreateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthorityResponseDto> {
    await this.validation.ensureInstitutionExists(dto.institutionId);
    await this.validation.ensureExternalAuthorityExists(dto.externalAuthorityId);

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    if (effectiveFrom && effectiveUntil) {
      this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);
    }

    try {
      return await this.prisma.institutionExternalAuthority.create({
        data: {
          institutionId: dto.institutionId,
          externalAuthorityId: dto.externalAuthorityId,
          relationshipLabel: dto.relationshipLabel,
          status: dto.status,
          effectiveFrom,
          effectiveUntil,
        },
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    query: QueryInstitutionExternalAuthoritiesDto,
  ): Promise<InstitutionExternalAuthorityResponseDto[]> {
    const where: Prisma.InstitutionExternalAuthorityWhereInput = {};

    if (query.institutionId !== undefined) {
      where.institutionId = query.institutionId;
    }

    if (query.externalAuthorityId !== undefined) {
      where.externalAuthorityId = query.externalAuthorityId;
    }

    if (query.status !== undefined) {
      where.status = query.status;
    }

    return this.prisma.institutionExternalAuthority.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async findOne(id: string): Promise<InstitutionExternalAuthorityResponseDto> {
    const record = await this.prisma.institutionExternalAuthority.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Institution external authority with id "${id}" was not found`);
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthority> {
    const existing = await this.findOne(id);

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing.effectiveFrom;
    const effectiveUntil =
      dto.effectiveUntil === undefined
        ? existing.effectiveUntil
        : dto.effectiveUntil === null
          ? null
          : new Date(dto.effectiveUntil);

    if (effectiveFrom && effectiveUntil) {
      this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);
    }

    return this.prisma.institutionExternalAuthority.update({
      where: { id },
      data: {
        relationshipLabel: dto.relationshipLabel,
        status: dto.status,
        effectiveFrom,
        effectiveUntil,
      },
    });
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        'Relationship between institution and external authority already exists',
      );
    }

    throw error;
  }
}
