import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationResponseDto } from './dto/delegation-response.dto';
import { QueryDelegationsDto } from './dto/query-delegations.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';

@Injectable()
export class DelegationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateDelegationDto): Promise<DelegationResponseDto> {
    await this.validation.validateDelegationStructuralIntegrity({
      institutionId: dto.institutionId,
      delegatorOfficeId: dto.delegatorOfficeId,
      delegatorOfficeholderId: dto.delegatorOfficeholderId,
      recipientOfficeId: dto.recipientOfficeId,
      recipientOfficeholderId: dto.recipientOfficeholderId,
    });

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const delegation = await this.prisma.delegation.create({
      data: {
        institutionId: dto.institutionId,
        delegatorOfficeId: dto.delegatorOfficeId,
        delegatorOfficeholderId: dto.delegatorOfficeholderId,
        recipientOfficeId: dto.recipientOfficeId,
        recipientOfficeholderId: dto.recipientOfficeholderId,
        scopeDescription: dto.scopeDescription,
        status: dto.status,
        effectiveFrom,
        effectiveUntil,
      },
    });

    return delegation;
  }

  async findAll(query: QueryDelegationsDto): Promise<DelegationResponseDto[]> {
    const where: Prisma.DelegationWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.institutionId !== undefined) {
      where.institutionId = query.institutionId;
    }

    return this.prisma.delegation.findMany({
      where,
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string): Promise<DelegationResponseDto> {
    const delegation = await this.prisma.delegation.findUnique({ where: { id } });

    if (!delegation) {
      throw new NotFoundException(`Delegation with id "${id}" was not found`);
    }

    return delegation;
  }

  async update(id: string, dto: UpdateDelegationDto): Promise<DelegationResponseDto> {
    const existing = await this.prisma.delegation.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Delegation with id "${id}" was not found`);
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing.effectiveFrom;
    const effectiveUntil =
      dto.effectiveUntil === undefined
        ? existing.effectiveUntil
        : dto.effectiveUntil === null
          ? null
          : new Date(dto.effectiveUntil);

    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    return this.prisma.delegation.update({
      where: { id },
      data: {
        scopeDescription: dto.scopeDescription,
        status: dto.status,
        effectiveFrom,
        effectiveUntil,
      },
    });
  }
}
