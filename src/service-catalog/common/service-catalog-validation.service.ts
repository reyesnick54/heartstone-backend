import { BadRequestException, Injectable } from '@nestjs/common';
import { ServiceFeeCalculationType } from '@prisma/client';
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

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServiceCatalogValidationService {
  constructor(private readonly prisma: PrismaService) {}

  validateEffectivePeriod(effectiveFrom: Date, effectiveUntil?: Date | null): void {
    if (
      effectiveUntil !== undefined &&
      effectiveUntil !== null &&
      effectiveUntil <= effectiveFrom
    ) {
      throw new BadRequestException('effectiveUntil must be after effectiveFrom');
    }
  }

  validateFeeCalculationConfiguration(
    calculationType: ServiceFeeCalculationType,
    fixedAmount?: string | null,
    calculationConfiguration?: Record<string, unknown>,
  ): void {
    if (calculationType === ServiceFeeCalculationType.FIXED && !fixedAmount) {
      throw new BadRequestException('FIXED fee calculation requires fixedAmount');
    }

    if (
      calculationType === ServiceFeeCalculationType.FORMULA_REFERENCE &&
      !calculationConfiguration?.formulaReference
    ) {
      throw new BadRequestException(
        'FORMULA_REFERENCE fee calculation requires calculationConfiguration.formulaReference',
      );
    }

    if (
      calculationType === ServiceFeeCalculationType.TIERED &&
      !Array.isArray(calculationConfiguration?.tiers)
    ) {
      throw new BadRequestException(
        'TIERED fee calculation requires calculationConfiguration.tiers array',
      );
    }

    if (
      calculationType === ServiceFeeCalculationType.VARIABLE_BY_CLASSIFICATION &&
      !calculationConfiguration?.classificationKey
    ) {
      throw new BadRequestException(
        'VARIABLE_BY_CLASSIFICATION fee calculation requires calculationConfiguration.classificationKey',
      );
    }
  }

  async assertServiceVersionExists(serviceVersionId: string): Promise<void> {
    const version = await this.prisma.serviceVersion.findUnique({
      where: { id: serviceVersionId },
    });
    if (!version) {
      throw new BadRequestException(`ServiceVersion "${serviceVersionId}" was not found`);
    }
  }

  async assertGoverningSourceExists(governingSourceId: string): Promise<void> {
    const source = await this.prisma.governingSource.findUnique({
      where: { id: governingSourceId },
    });
    if (!source) {
      throw new BadRequestException(`GoverningSource "${governingSourceId}" was not found`);
    }
  }

  async assertInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      throw new BadRequestException(`Institution "${institutionId}" was not found`);
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
  async ensureInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with id "${institutionId}" was not found`);
    }
  }

  async ensureDepartmentExistsForInstitution(
    departmentId: string,
    institutionId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, institutionId: true },
    });

    if (!department) {
      throw new NotFoundException(`Department with id "${departmentId}" was not found`);
    }

    if (department.institutionId !== institutionId) {
      throw new BadRequestException(
        `Department "${departmentId}" does not belong to institution "${institutionId}"`,
      );
    }
  }

  async ensureServiceFamilyExists(serviceFamilyId: string): Promise<void> {
    const family = await this.prisma.serviceFamily.findUnique({
      where: { id: serviceFamilyId },
      select: { id: true },
    });

    if (!family) {
      throw new NotFoundException(`Service family with id "${serviceFamilyId}" was not found`);
    }
  }

  async ensureGovernmentServiceExists(governmentServiceId: string): Promise<void> {
    const service = await this.prisma.governmentService.findUnique({
      where: { id: governmentServiceId },
      select: { id: true },
    });

    if (!service) {
      throw new NotFoundException(
        `Government service with id "${governmentServiceId}" was not found`,
      );
    }
  }

  async ensureGovernmentServiceVersionExists(versionId: string): Promise<void> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!version) {
      throw new NotFoundException(
        `Government service version with id "${versionId}" was not found`,
      );
    }
  }

  async ensureFunctionAuthorityRecordExists(functionAuthorityRecordId: string): Promise<void> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: functionAuthorityRecordId },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException(
        `Function authority record with id "${functionAuthorityRecordId}" was not found`,
      );
    }
  }
}
