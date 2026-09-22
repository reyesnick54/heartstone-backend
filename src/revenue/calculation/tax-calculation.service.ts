import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import {
  type TaxCalculationInput,
  type TaxCalculationResult,
} from '../common/tax-calculation.types';
import { ConfigurableTaxCalculationEngine } from './configurable-tax-calculation.engine';

@Injectable()
export class TaxCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
    private readonly engine: ConfigurableTaxCalculationEngine,
  ) {}

  async recordDeterministicCalculation(
    input: TaxCalculationInput,
  ): Promise<{ recordId: string; result: TaxCalculationResult }> {
    this.boundary.assertCalculationRecordsRuleVersion(input.ruleConfigurationVersion);

    const version = await this.prisma.taxTypeDefinitionVersion.findUnique({
      where: { id: input.taxTypeDefinitionVersionId },
    });
    if (!version) {
      throw new NotFoundException(
        `TaxTypeDefinitionVersion ${input.taxTypeDefinitionVersionId} not found`,
      );
    }

    const result = this.engine.calculate(input);

    const record = await this.prisma.taxCalculationRecord.create({
      data: {
        jurisdictionId: input.jurisdictionId,
        taxPeriodId: input.taxPeriodId,
        taxTypeDefinitionVersionId: input.taxTypeDefinitionVersionId,
        ruleConfigurationVersion: input.ruleConfigurationVersion,
        inputs: input.inputs as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        methodologyReference: input.methodologyReference,
        calculatedByActorKind: input.calculatedByActorKind,
        calculatedByIdentityId: input.calculatedByIdentityId,
      },
    });

    return { recordId: record.id, result };
  }
}
