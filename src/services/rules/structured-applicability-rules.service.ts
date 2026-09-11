import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  StructuredApplicabilityRule,
  StructuredApplicabilityRuleStatus,
  StructuredApplicabilityRuleType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateStructuredApplicabilityRuleInput {
  serviceVersionId: string;
  code: string;
  name: string;
  description?: string;
  ruleType: StructuredApplicabilityRuleType;
  configuration: Record<string, unknown>;
}

@Injectable()
export class StructuredApplicabilityRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateStructuredApplicabilityRuleInput,
  ): Promise<StructuredApplicabilityRule> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: input.serviceVersionId },
    });

    if (!serviceVersion) {
      throw new NotFoundException(
        `Government service version "${input.serviceVersionId}" was not found`,
      );
    }

    return this.prisma.structuredApplicabilityRule.create({
      data: {
        serviceVersionId: input.serviceVersionId,
        code: input.code,
        name: input.name,
        description: input.description,
        ruleType: input.ruleType,
        configuration: input.configuration as Prisma.InputJsonValue,
        status: StructuredApplicabilityRuleStatus.DRAFT,
      },
    });
  }

  async activate(id: string): Promise<StructuredApplicabilityRule> {
    await this.findOne(id);

    return this.prisma.structuredApplicabilityRule.update({
      where: { id },
      data: { status: StructuredApplicabilityRuleStatus.ACTIVE },
    });
  }

  async findOne(id: string): Promise<StructuredApplicabilityRule> {
    const rule = await this.prisma.structuredApplicabilityRule.findUnique({ where: { id } });

    if (!rule) {
      throw new NotFoundException(`Structured applicability rule "${id}" was not found`);
    }

    return rule;
  }
}
