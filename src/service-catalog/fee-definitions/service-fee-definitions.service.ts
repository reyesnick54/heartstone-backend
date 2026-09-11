import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceFeeDefinition } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import {
  isCurrentOperatingMetadata,
  waiverAvailabilityDoesNotWaiveFee,
} from '../common/service-operating-metadata.util';
import { CreateServiceFeeDefinitionDto } from './dto/create-service-fee-definition.dto';
import { ServiceFeeDefinitionResponseDto } from './dto/service-fee-definition-response.dto';

@Injectable()
export class ServiceFeeDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateServiceFeeDefinitionDto): Promise<ServiceFeeDefinitionResponseDto> {
    await this.validation.assertServiceVersionExists(dto.serviceVersionId);
    await this.validation.assertGoverningSourceExists(dto.governingSourceId);
    await this.validation.assertInstitutionExists(dto.collectingInstitutionId);

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);
    this.validation.validateFeeCalculationConfiguration(
      dto.calculationType,
      dto.fixedAmount,
      dto.calculationConfiguration,
    );

    const fee = await this.prisma.serviceFeeDefinition.create({
      data: {
        serviceVersionId: dto.serviceVersionId,
        feeCode: dto.feeCode,
        name: dto.name,
        description: dto.description,
        currency: dto.currency,
        calculationType: dto.calculationType,
        fixedAmount: dto.fixedAmount ? new Prisma.Decimal(dto.fixedAmount) : null,
        calculationConfiguration: (dto.calculationConfiguration ?? {}) as Prisma.InputJsonValue,
        governingSourceId: dto.governingSourceId,
        collectingInstitutionId: dto.collectingInstitutionId,
        refundability: dto.refundability,
        waiverReductionAvailable: dto.waiverReductionAvailable ?? false,
        waiverAuthorityFunctionId: dto.waiverAuthorityFunctionId,
        isExternalProfessionalFee: dto.isExternalProfessionalFee ?? false,
        effectiveFrom,
        effectiveUntil,
        status: dto.status,
      },
    });

    return this.toResponse(fee);
  }

  async findOne(id: string): Promise<ServiceFeeDefinitionResponseDto> {
    const fee = await this.prisma.serviceFeeDefinition.findUnique({ where: { id } });
    if (!fee) {
      throw new NotFoundException(`ServiceFeeDefinition "${id}" was not found`);
    }
    return this.toResponse(fee);
  }

  async findByServiceVersion(serviceVersionId: string): Promise<ServiceFeeDefinitionResponseDto[]> {
    const fees = await this.prisma.serviceFeeDefinition.findMany({
      where: { serviceVersionId },
      orderBy: [{ feeCode: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return fees.map((fee) => this.toResponse(fee));
  }

  async findCurrentByFeeCode(
    serviceVersionId: string,
    feeCode: string,
    at: Date = new Date(),
  ): Promise<ServiceFeeDefinitionResponseDto | null> {
    const fees = await this.prisma.serviceFeeDefinition.findMany({
      where: { serviceVersionId, feeCode },
      orderBy: [{ effectiveFrom: 'desc' }],
    });

    const current = fees.find((fee) =>
      isCurrentOperatingMetadata(
        {
          status: fee.status,
          effectiveFrom: fee.effectiveFrom,
          effectiveUntil: fee.effectiveUntil,
        },
        at,
      ),
    );

    return current ? this.toResponse(current, at) : null;
  }

  toResponse(fee: ServiceFeeDefinition, at: Date = new Date()): ServiceFeeDefinitionResponseDto {
    const waiverState = waiverAvailabilityDoesNotWaiveFee(fee.waiverReductionAvailable);

    return {
      id: fee.id,
      serviceVersionId: fee.serviceVersionId,
      feeCode: fee.feeCode,
      name: fee.name,
      description: fee.description,
      currency: fee.currency,
      calculationType: fee.calculationType,
      fixedAmount: fee.fixedAmount !== null ? fee.fixedAmount.toFixed(2) : null,
      calculationConfiguration: fee.calculationConfiguration as Record<string, unknown>,
      governingSourceId: fee.governingSourceId,
      collectingInstitutionId: fee.collectingInstitutionId,
      refundability: fee.refundability,
      waiverReductionAvailable: waiverState.waiverReductionAvailable,
      waiverAuthorityFunctionId: fee.waiverAuthorityFunctionId,
      isExternalProfessionalFee: fee.isExternalProfessionalFee,
      effectiveFrom: fee.effectiveFrom,
      effectiveUntil: fee.effectiveUntil,
      status: fee.status,
      isCurrent: isCurrentOperatingMetadata(
        {
          status: fee.status,
          effectiveFrom: fee.effectiveFrom,
          effectiveUntil: fee.effectiveUntil,
        },
        at,
      ),
      waived: waiverState.waived,
      createdAt: fee.createdAt,
      updatedAt: fee.updatedAt,
    };
  }
}
