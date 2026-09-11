import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityConditionType,
  AuthorityDependencyType,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  FunctionAuthorityRecord,
  Prisma,
  SodRuleType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateFunctionAuthorityRecordDto } from './dto/create-function-authority-record.dto';
import { FunctionAuthorityRecordResponseDto } from './dto/function-authority-record-response.dto';

export interface LinkGoverningSourceInput {
  functionAuthorityRecordId: string;
  governingSourceId: string;
  isPrimary?: boolean;
}

export interface CreateAssignmentInput {
  functionAuthorityRecordId: string;
  officeholderId?: string;
  officeId?: string;
  institutionId?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
}

export interface CreateActionRightInput {
  functionAuthorityRecordId: string;
  action: AuthorityActionType;
  permitted: boolean;
  requiresHumanActor?: boolean;
}

export interface CreateConditionInput {
  functionAuthorityRecordId: string;
  conditionType: AuthorityConditionType;
  configuration?: Record<string, unknown>;
  isRequired?: boolean;
}

export interface CreateDependencyInput {
  functionAuthorityRecordId: string;
  dependencyType: AuthorityDependencyType;
  externalAuthorityId?: string;
  configuration?: Record<string, unknown>;
}

export interface CreateSodRuleInput {
  functionAuthorityRecordId: string;
  ruleType: SodRuleType;
  conflictingAction?: AuthorityActionType;
  configuration?: Record<string, unknown>;
}

@Injectable()
export class FunctionAuthorityRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFunctionAuthorityRecordDto): Promise<FunctionAuthorityRecordResponseDto> {
    const record = await this.prisma.functionAuthorityRecord.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        classification: dto.classification,
        functionClass: dto.functionClass,
        institutionId: dto.institutionId,
        officeId: dto.officeId,
        requiresDelegation: dto.requiresDelegation ?? false,
        requiresAppointment: dto.requiresAppointment ?? true,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.DRAFT,
      },
    });

    return this.toResponse(record);
  }

  async findOne(id: string): Promise<FunctionAuthorityRecordResponseDto> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`FunctionAuthorityRecord "${id}" was not found`);
    }
    return this.toResponse(record);
  }

  async findAll(query?: {
    classification?: Prisma.EnumAuthorityClassificationFilter;
    lifecycleStatus?: FunctionAuthorityLifecycleStatus;
  }): Promise<FunctionAuthorityRecordResponseDto[]> {
    const where: Prisma.FunctionAuthorityRecordWhereInput = {};
    if (query?.classification) {
      where.classification = query.classification;
    }
    if (query?.lifecycleStatus) {
      where.lifecycleStatus = query.lifecycleStatus;
    }

    const records = await this.prisma.functionAuthorityRecord.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map((record) => this.toResponse(record));
  }

  async linkGoverningSource(input: LinkGoverningSourceInput) {
    return this.prisma.functionGoverningSource.create({
      data: {
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        governingSourceId: input.governingSourceId,
        isPrimary: input.isPrimary ?? true,
      },
    });
  }

  async createAssignment(input: CreateAssignmentInput) {
    return this.prisma.functionAuthorityAssignment.create({
      data: {
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        officeholderId: input.officeholderId,
        officeId: input.officeId,
        institutionId: input.institutionId,
        status: FunctionAssignmentStatus.ACTIVE,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil ?? null,
      },
    });
  }

  async createActionRight(input: CreateActionRightInput) {
    return this.prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        action: input.action,
        permitted: input.permitted,
        requiresHumanActor: input.requiresHumanActor ?? true,
      },
    });
  }

  async createCondition(input: CreateConditionInput) {
    return this.prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        conditionType: input.conditionType,
        configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
        isRequired: input.isRequired ?? true,
      },
    });
  }

  async createDependency(input: CreateDependencyInput) {
    return this.prisma.authorityDependency.create({
      data: {
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        dependencyType: input.dependencyType,
        externalAuthorityId: input.externalAuthorityId,
        configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async createSodRule(input: CreateSodRuleInput) {
    return this.prisma.segregationOfDutyRule.create({
      data: {
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        ruleType: input.ruleType,
        conflictingAction: input.conflictingAction,
        configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  toResponse(record: FunctionAuthorityRecord): FunctionAuthorityRecordResponseDto {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      classification: record.classification,
      functionClass: record.functionClass,
      lifecycleStatus: record.lifecycleStatus,
      institutionId: record.institutionId,
      officeId: record.officeId,
      requiresDelegation: record.requiresDelegation,
      requiresAppointment: record.requiresAppointment,
      activatedAt: record.activatedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
