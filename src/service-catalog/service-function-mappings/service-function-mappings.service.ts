import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceFunctionMapping } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { CreateServiceFunctionMappingDto } from './dto/create-service-function-mapping.dto';
import { ServiceFunctionMappingResponseDto } from './dto/service-function-mapping-response.dto';

type MappingWithFunction = Prisma.ServiceFunctionMappingGetPayload<{
  include: { functionAuthorityRecord: { select: { code: true; name: true } } };
}>;

@Injectable()
export class ServiceFunctionMappingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(
    governmentServiceVersionId: string,
    dto: CreateServiceFunctionMappingDto,
  ): Promise<ServiceFunctionMappingResponseDto> {
    await this.validation.ensureGovernmentServiceVersionExists(governmentServiceVersionId);
    await this.validation.ensureFunctionAuthorityRecordExists(dto.functionAuthorityRecordId);

    try {
      const mapping = await this.prisma.serviceFunctionMapping.create({
        data: {
          governmentServiceVersionId,
          functionAuthorityRecordId: dto.functionAuthorityRecordId,
          sequenceOrder: dto.sequenceOrder ?? 0,
          isConsequential: dto.isConsequential ?? true,
          publicStageLabel: dto.publicStageLabel,
          status: dto.status,
          effectiveFrom: dto.effectiveFrom,
          effectiveUntil: dto.effectiveUntil,
        },
        include: {
          functionAuthorityRecord: {
            select: { code: true, name: true },
          },
        },
      });

      return this.toResponse(mapping);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'This function authority record is already mapped to the service version',
        );
      }

      throw error;
    }
  }

  async findAllForVersion(
    governmentServiceVersionId: string,
  ): Promise<ServiceFunctionMappingResponseDto[]> {
    await this.validation.ensureGovernmentServiceVersionExists(governmentServiceVersionId);

    const mappings = await this.prisma.serviceFunctionMapping.findMany({
      where: { governmentServiceVersionId },
      include: {
        functionAuthorityRecord: {
          select: { code: true, name: true },
        },
      },
      orderBy: [{ sequenceOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return mappings.map((mapping) => this.toResponse(mapping));
  }

  async findOne(id: string): Promise<ServiceFunctionMapping> {
    const mapping = await this.prisma.serviceFunctionMapping.findUnique({ where: { id } });

    if (!mapping) {
      throw new NotFoundException(`Service function mapping with id "${id}" was not found`);
    }

    return mapping;
  }

  private toResponse(mapping: MappingWithFunction): ServiceFunctionMappingResponseDto {
    return {
      id: mapping.id,
      governmentServiceVersionId: mapping.governmentServiceVersionId,
      functionAuthorityRecordId: mapping.functionAuthorityRecordId,
      sequenceOrder: mapping.sequenceOrder,
      isConsequential: mapping.isConsequential,
      publicStageLabel: mapping.publicStageLabel,
      status: mapping.status,
      effectiveFrom: mapping.effectiveFrom,
      effectiveUntil: mapping.effectiveUntil,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
      functionAuthorityRecordCode: mapping.functionAuthorityRecord.code,
      functionAuthorityRecordName: mapping.functionAuthorityRecord.name,
    };
  }
}
