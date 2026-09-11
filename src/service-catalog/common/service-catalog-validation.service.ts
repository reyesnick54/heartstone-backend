import { BadRequestException, Injectable } from '@nestjs/common';
import { ServiceFeeCalculationType } from '@prisma/client';

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
    }
  }
}
