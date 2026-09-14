import { Injectable } from '@nestjs/common';
import { CommunicationMandatoryCategory, type MandatoryCommunicationRule } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateMandatoryCommunicationRuleInput {
  templateId?: string;
  mandatoryCategory: CommunicationMandatoryCategory;
  communicationType?: string;
  description: string;
}

@Injectable()
export class MandatoryCommunicationRuleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(
    input: CreateMandatoryCommunicationRuleInput,
  ): Promise<MandatoryCommunicationRule> {
    return this.prisma.mandatoryCommunicationRule.create({
      data: {
        templateId: input.templateId,
        mandatoryCategory: input.mandatoryCategory,
        communicationType: input.communicationType,
        suppressible: false,
        description: input.description,
      },
    });
  }

  async isMandatoryCategory(category: CommunicationMandatoryCategory): Promise<boolean> {
    const rule = await this.prisma.mandatoryCommunicationRule.findFirst({
      where: { mandatoryCategory: category, suppressible: false },
    });
    return Boolean(rule);
  }

  async listRules(): Promise<MandatoryCommunicationRule[]> {
    return this.prisma.mandatoryCommunicationRule.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
}
