import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstitutionExternalAuthority, Prisma, RecordStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ExternalAuthorityService } from '../external-authority/external-authority.service';
import { InstitutionService } from '../institution/institution.service';
import { CreateInstitutionExternalAuthorityDto } from './dto/create-institution-external-authority.dto';
import { ListInstitutionExternalAuthoritiesQueryDto } from './dto/list-institution-external-authorities-query.dto';
import { UpdateInstitutionExternalAuthorityDto } from './dto/update-institution-external-authority.dto';

@Injectable()
export class InstitutionExternalAuthorityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly institutionService: InstitutionService,
    private readonly externalAuthorityService: ExternalAuthorityService,
  ) {}

  async create(dto: CreateInstitutionExternalAuthorityDto): Promise<InstitutionExternalAuthority> {
    await this.institutionService.assertActive(dto.institutionId);
    await this.externalAuthorityService.assertActive(dto.externalAuthorityId);

    const duplicateActive = await this.prisma.institutionExternalAuthority.findFirst({
      where: {
        institutionId: dto.institutionId,
        externalAuthorityId: dto.externalAuthorityId,
        relationshipType: dto.relationshipType,
        status: RecordStatus.ACTIVE,
      },
    });

    if (duplicateActive) {
      throw new ConflictException(
        'An active relationship with the same institution, external authority, and relationship type already exists',
      );
    }

    return this.prisma.institutionExternalAuthority.create({
      data: {
        institutionId: dto.institutionId,
        externalAuthorityId: dto.externalAuthorityId,
        relationshipType: dto.relationshipType,
        description: dto.description,
      },
    });
  }

  async findAll(
    query: ListInstitutionExternalAuthoritiesQueryDto,
  ): Promise<InstitutionExternalAuthority[]> {
    if (!query.institutionId && !query.externalAuthorityId) {
      throw new BadRequestException(
        'Either institutionId or externalAuthorityId query parameter is required',
      );
    }

    const where: Prisma.InstitutionExternalAuthorityWhereInput = {};

    if (query.institutionId) {
      where.institutionId = query.institutionId;
    }

    if (query.externalAuthorityId) {
      where.externalAuthorityId = query.externalAuthorityId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.institutionExternalAuthority.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findById(id: string): Promise<InstitutionExternalAuthority> {
    const relationship = await this.prisma.institutionExternalAuthority.findUnique({
      where: { id },
    });

    if (!relationship) {
      throw new NotFoundException(`Institution external authority relationship '${id}' not found`);
    }

    return relationship;
  }

  async update(
    id: string,
    dto: UpdateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthority> {
    const existing = await this.findById(id);

    const nextRelationshipType = dto.relationshipType ?? existing.relationshipType;
    const nextStatus = dto.status ?? existing.status;

    if (nextStatus === RecordStatus.ACTIVE) {
      const duplicateActive = await this.prisma.institutionExternalAuthority.findFirst({
        where: {
          id: { not: id },
          institutionId: existing.institutionId,
          externalAuthorityId: existing.externalAuthorityId,
          relationshipType: nextRelationshipType,
          status: RecordStatus.ACTIVE,
        },
      });

      if (duplicateActive) {
        throw new ConflictException(
          'An active relationship with the same institution, external authority, and relationship type already exists',
        );
      }
    }

    return this.prisma.institutionExternalAuthority.update({
      where: { id },
      data: dto,
    });
  }
}
