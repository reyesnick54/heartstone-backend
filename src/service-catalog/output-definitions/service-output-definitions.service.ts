import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceOutputDefinition } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import {
  isCurrentOperatingMetadata,
  outputDefinitionDoesNotIssue,
} from '../common/service-operating-metadata.util';
import { CreateServiceOutputDefinitionDto } from './dto/create-service-output-definition.dto';
import { ServiceOutputDefinitionResponseDto } from './dto/service-output-definition-response.dto';

@Injectable()
export class ServiceOutputDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateServiceOutputDefinitionDto): Promise<ServiceOutputDefinitionResponseDto> {
    await this.validation.assertServiceVersionExists(dto.serviceVersionId);
    if (dto.issuingInstitutionId) {
      await this.validation.assertInstitutionExists(dto.issuingInstitutionId);
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const output = await this.prisma.serviceOutputDefinition.create({
      data: {
        serviceVersionId: dto.serviceVersionId,
        outputType: dto.outputType,
        publicName: dto.publicName,
        description: dto.description,
        issuingInstitutionId: dto.issuingInstitutionId,
        expectedValidityDescription: dto.expectedValidityDescription,
        renewalRequired: dto.renewalRequired ?? false,
        authorityFunctionId: dto.authorityFunctionId,
        electronicIssuanceEligible: dto.electronicIssuanceEligible ?? false,
        electronicIssuanceMetadata: (dto.electronicIssuanceMetadata ?? {}) as Prisma.InputJsonValue,
        effectiveFrom,
        effectiveUntil,
        status: dto.status,
      },
    });

    return this.toResponse(output);
  }

  async findOne(id: string): Promise<ServiceOutputDefinitionResponseDto> {
    const output = await this.prisma.serviceOutputDefinition.findUnique({ where: { id } });
    if (!output) {
      throw new NotFoundException(`ServiceOutputDefinition "${id}" was not found`);
    }
    return this.toResponse(output);
  }

  async findByServiceVersion(
    serviceVersionId: string,
  ): Promise<ServiceOutputDefinitionResponseDto[]> {
    const outputs = await this.prisma.serviceOutputDefinition.findMany({
      where: { serviceVersionId },
      orderBy: [{ outputType: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return outputs.map((output) => this.toResponse(output));
  }

  toResponse(
    output: ServiceOutputDefinition,
    at: Date = new Date(),
  ): ServiceOutputDefinitionResponseDto {
    const issuanceState = outputDefinitionDoesNotIssue(output.outputType);

    return {
      id: output.id,
      serviceVersionId: output.serviceVersionId,
      outputType: output.outputType,
      publicName: output.publicName,
      description: output.description,
      issuingInstitutionId: output.issuingInstitutionId,
      expectedValidityDescription: output.expectedValidityDescription,
      renewalRequired: output.renewalRequired,
      authorityFunctionId: output.authorityFunctionId,
      electronicIssuanceEligible: output.electronicIssuanceEligible,
      electronicIssuanceMetadata: output.electronicIssuanceMetadata as Record<string, unknown>,
      effectiveFrom: output.effectiveFrom,
      effectiveUntil: output.effectiveUntil,
      status: output.status,
      isCurrent: isCurrentOperatingMetadata(
        {
          status: output.status,
          effectiveFrom: output.effectiveFrom,
          effectiveUntil: output.effectiveUntil,
        },
        at,
      ),
      issued: issuanceState.issued,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
