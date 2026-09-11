import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentServiceVersionStatus,
  ServiceEligibilityRuleCategory,
  ServiceEligibilityRuleOperator,
  ServiceEligibilityRuleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CATEGORY_FACT_KEYS,
  OPERATORS_REQUIRING_NUMERIC,
  OPERATORS_REQUIRING_VALUE,
} from '../service-catalog.constants';

export interface RuleConfigurationInput {
  category: ServiceEligibilityRuleCategory;
  attributeKey: string;
  operator: ServiceEligibilityRuleOperator;
  expectedValue: unknown;
  reasonCode: string;
}

@Injectable()
export class ServiceCatalogValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureGovernmentServiceExists(id: string): Promise<void> {
    const service = await this.prisma.governmentService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Government service ${id} not found`);
    }
  }

  async ensureGovernmentServiceVersionExists(id: string): Promise<void> {
    const version = await this.prisma.governmentServiceVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`Government service version ${id} not found`);
    }
  }

  validateRuleConfiguration(input: RuleConfigurationInput): void {
    if (!input.reasonCode.trim()) {
      throw new BadRequestException('reasonCode is required');
    }

    if (!input.attributeKey.trim()) {
      throw new BadRequestException('attributeKey is required');
    }

    const knownCategories = Object.keys(CATEGORY_FACT_KEYS);
    if (!knownCategories.includes(input.category)) {
      throw new BadRequestException(`Unsupported rule category: ${input.category}`);
    }

    const knownOperators = Object.values(ServiceEligibilityRuleOperator);
    if (!knownOperators.includes(input.operator)) {
      throw new BadRequestException(`Unsupported rule operator: ${input.operator}`);
    }

    if (OPERATORS_REQUIRING_VALUE.has(input.operator)) {
      if (input.expectedValue === undefined || input.expectedValue === null) {
        throw new BadRequestException(`Operator ${input.operator} requires expectedValue`);
      }
    }

    if (OPERATORS_REQUIRING_NUMERIC.has(input.operator)) {
      const value = this.extractComparableValue(input.expectedValue);
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new BadRequestException(
          `Operator ${input.operator} requires a numeric expectedValue`,
        );
      }
    }

    if (
      input.operator === ServiceEligibilityRuleOperator.IN ||
      input.operator === ServiceEligibilityRuleOperator.NOT_IN
    ) {
      const values = this.extractArrayValue(input.expectedValue);
      if (!Array.isArray(values) || values.length === 0) {
        throw new BadRequestException(
          `Operator ${input.operator} requires a non-empty array expectedValue`,
        );
      }
    }

    if (input.operator === ServiceEligibilityRuleOperator.CONTAINS) {
      if (typeof input.expectedValue !== 'string' && !this.isValueWrapper(input.expectedValue)) {
        throw new BadRequestException('Operator CONTAINS requires a string expectedValue');
      }
    }
  }

  assertVersionAllowsRuleMutation(
    versionStatus: GovernmentServiceVersionStatus,
    ruleStatus?: ServiceEligibilityRuleStatus,
  ): void {
    if (versionStatus === GovernmentServiceVersionStatus.ARCHIVED) {
      throw new BadRequestException('Cannot modify rules on an archived service version');
    }
    if (ruleStatus === ServiceEligibilityRuleStatus.ARCHIVED) {
      throw new BadRequestException('Cannot modify an archived eligibility rule');
    }
  }

  private extractComparableValue(expectedValue: unknown): unknown {
    if (this.isValueWrapper(expectedValue)) {
      return (expectedValue as { value: unknown }).value;
    }
    return expectedValue;
  }

  private extractArrayValue(expectedValue: unknown): unknown[] | null {
    if (Array.isArray(expectedValue)) {
      return expectedValue as unknown[];
    }
    if (this.isValueWrapper(expectedValue)) {
      const wrapped = (expectedValue as { value: unknown }).value;
      return Array.isArray(wrapped) ? wrapped : null;
    }
    return null;
  }

  private isValueWrapper(value: unknown): boolean {
    return typeof value === 'object' && value !== null && 'value' in value;
  }
}
