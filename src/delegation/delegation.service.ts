import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Delegation, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import {
  countDelegationTargets,
  DelegationTargetInput,
  DelegationTargetRef,
  delegationTargetsAreSame,
  resolveDelegationTarget,
} from './delegation-target.types';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationQueryDto } from './dto/delegation-query.dto';
import { DelegationResponseDto } from './dto/delegation-response.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';

type DelegationRecord = Delegation;

@Injectable()
export class DelegationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDelegationDto): Promise<DelegationResponseDto> {
    this.validateSourceReference(dto.sourceReference);
    this.validateScopeDescription(dto.scopeDescription);
    this.validateEffectiveDates(dto.effectiveFrom, dto.effectiveUntil);

    const delegator = this.validateAndResolveTarget('delegator', dto.delegator);
    const recipient = this.validateAndResolveTarget('recipient', dto.recipient);

    if (delegationTargetsAreSame(delegator, recipient)) {
      throw new BadRequestException('Delegation cannot delegate to itself');
    }

    await this.assertTargetExists(delegator);
    await this.assertTargetExists(recipient);

    const delegation = await this.prisma.delegation.create({
      data: {
        ...this.toDelegatorFkFields(delegator),
        ...this.toRecipientFkFields(recipient),
        referenceCode: dto.referenceCode,
        sourceReference: dto.sourceReference,
        scopeDescription: dto.scopeDescription,
        status: dto.status,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil ?? null,
        notes: dto.notes ?? null,
      },
    });

    return this.toResponse(delegation);
  }

  async findAll(query: DelegationQueryDto): Promise<DelegationResponseDto[]> {
    const where: Prisma.DelegationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.delegatorInstitutionId) {
      where.delegatorInstitutionId = query.delegatorInstitutionId;
    }
    if (query.delegatorOfficeId) {
      where.delegatorOfficeId = query.delegatorOfficeId;
    }
    if (query.delegatorOfficeholderId) {
      where.delegatorOfficeholderId = query.delegatorOfficeholderId;
    }

    if (query.recipientInstitutionId) {
      where.recipientInstitutionId = query.recipientInstitutionId;
    }
    if (query.recipientOfficeId) {
      where.recipientOfficeId = query.recipientOfficeId;
    }
    if (query.recipientOfficeholderId) {
      where.recipientOfficeholderId = query.recipientOfficeholderId;
    }

    if (query.effectiveOn) {
      where.effectiveFrom = { lte: query.effectiveOn };
      where.OR = [{ effectiveUntil: null }, { effectiveUntil: { gte: query.effectiveOn } }];
    }

    const delegations = await this.prisma.delegation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return delegations.map((delegation) => this.toResponse(delegation));
  }

  async findOne(id: string): Promise<DelegationResponseDto> {
    const delegation = await this.prisma.delegation.findUnique({ where: { id } });
    if (!delegation) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }
    return this.toResponse(delegation);
  }

  async update(id: string, dto: UpdateDelegationDto): Promise<DelegationResponseDto> {
    const existing = await this.prisma.delegation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }

    if (dto.sourceReference !== undefined) {
      this.validateSourceReference(dto.sourceReference);
    }
    if (dto.scopeDescription !== undefined) {
      this.validateScopeDescription(dto.scopeDescription);
    }

    const effectiveFrom = dto.effectiveFrom ?? existing.effectiveFrom;
    const effectiveUntil =
      dto.effectiveUntil !== undefined ? dto.effectiveUntil : existing.effectiveUntil;
    this.validateEffectiveDates(effectiveFrom, effectiveUntil);

    const delegation = await this.prisma.delegation.update({
      where: { id },
      data: {
        sourceReference: dto.sourceReference,
        scopeDescription: dto.scopeDescription,
        status: dto.status,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
        notes: dto.notes,
      },
    });

    return this.toResponse(delegation);
  }

  validateAndResolveTarget(
    role: 'delegator' | 'recipient',
    target: DelegationTargetInput,
  ): DelegationTargetRef {
    const count = countDelegationTargets(target);
    if (count === 0) {
      throw new BadRequestException(`Exactly one ${role} target is required`);
    }
    if (count > 1) {
      throw new BadRequestException(`Only one ${role} target may be specified`);
    }

    const resolved = resolveDelegationTarget(target);
    if (!resolved) {
      throw new BadRequestException(`Exactly one ${role} target is required`);
    }

    return resolved;
  }

  validateSourceReference(sourceReference: string): void {
    if (!sourceReference || sourceReference.trim() === '') {
      throw new BadRequestException('sourceReference is required');
    }
  }

  validateScopeDescription(scopeDescription: string): void {
    if (!scopeDescription || scopeDescription.trim() === '') {
      throw new BadRequestException('scopeDescription is required');
    }
  }

  validateEffectiveDates(effectiveFrom: Date, effectiveUntil?: Date | null): void {
    if (effectiveUntil && effectiveUntil < effectiveFrom) {
      throw new BadRequestException('effectiveUntil cannot precede effectiveFrom');
    }
  }

  async assertTargetExists(target: DelegationTargetRef): Promise<void> {
    switch (target.type) {
      case 'institution': {
        const institution = await this.prisma.institution.findUnique({
          where: { id: target.id },
        });
        if (!institution) {
          throw new BadRequestException(`Institution ${target.id} not found`);
        }
        return;
      }
      case 'office': {
        const office = await this.prisma.office.findUnique({ where: { id: target.id } });
        if (!office) {
          throw new BadRequestException(`Office ${target.id} not found`);
        }
        return;
      }
      case 'officeholder': {
        const officeholder = await this.prisma.officeholder.findUnique({
          where: { id: target.id },
        });
        if (!officeholder) {
          throw new BadRequestException(`Officeholder ${target.id} not found`);
        }
        return;
      }
    }
  }

  toDelegatorFkFields(
    target: DelegationTargetRef,
  ): Pick<
    Prisma.DelegationUncheckedCreateInput,
    'delegatorInstitutionId' | 'delegatorOfficeId' | 'delegatorOfficeholderId'
  > {
    return {
      delegatorInstitutionId: target.type === 'institution' ? target.id : null,
      delegatorOfficeId: target.type === 'office' ? target.id : null,
      delegatorOfficeholderId: target.type === 'officeholder' ? target.id : null,
    };
  }

  toRecipientFkFields(
    target: DelegationTargetRef,
  ): Pick<
    Prisma.DelegationUncheckedCreateInput,
    'recipientInstitutionId' | 'recipientOfficeId' | 'recipientOfficeholderId'
  > {
    return {
      recipientInstitutionId: target.type === 'institution' ? target.id : null,
      recipientOfficeId: target.type === 'office' ? target.id : null,
      recipientOfficeholderId: target.type === 'officeholder' ? target.id : null,
    };
  }

  toResponse(delegation: DelegationRecord): DelegationResponseDto {
    const delegator = this.resolveStoredTarget('delegator', delegation);
    const recipient = this.resolveStoredTarget('recipient', delegation);

    return {
      id: delegation.id,
      referenceCode: delegation.referenceCode,
      sourceReference: delegation.sourceReference,
      scopeDescription: delegation.scopeDescription,
      status: delegation.status,
      effectiveFrom: delegation.effectiveFrom,
      effectiveUntil: delegation.effectiveUntil,
      delegator,
      recipient,
      notes: delegation.notes,
      createdAt: delegation.createdAt,
      updatedAt: delegation.updatedAt,
    };
  }

  private resolveStoredTarget(
    role: 'delegator' | 'recipient',
    delegation: DelegationRecord,
  ): DelegationTargetRef {
    if (role === 'delegator') {
      if (delegation.delegatorInstitutionId) {
        return { type: 'institution', id: delegation.delegatorInstitutionId };
      }
      if (delegation.delegatorOfficeId) {
        return { type: 'office', id: delegation.delegatorOfficeId };
      }
      if (delegation.delegatorOfficeholderId) {
        return { type: 'officeholder', id: delegation.delegatorOfficeholderId };
      }
    } else {
      if (delegation.recipientInstitutionId) {
        return { type: 'institution', id: delegation.recipientInstitutionId };
      }
      if (delegation.recipientOfficeId) {
        return { type: 'office', id: delegation.recipientOfficeId };
      }
      if (delegation.recipientOfficeholderId) {
        return { type: 'officeholder', id: delegation.recipientOfficeholderId };
      }
    }

    throw new Error(`Delegation ${delegation.id} has no ${role} target`);
  }
}
