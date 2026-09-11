import { Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentService } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { GovernmentServiceResponseDto } from './dto/government-service-response.dto';

@Injectable()
export class GovernmentServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateGovernmentServiceDto): Promise<GovernmentServiceResponseDto> {
    await this.validation.assertInstitutionExists(dto.responsibleInstitutionId);

    const service = await this.prisma.governmentService.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        responsibleInstitutionId: dto.responsibleInstitutionId,
      },
    });

    return this.toResponse(service);
  }

  async findOne(id: string): Promise<GovernmentServiceResponseDto> {
    const service = await this.prisma.governmentService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`GovernmentService "${id}" was not found`);
    }
    return this.toResponse(service);
  }

  async findAll(): Promise<GovernmentServiceResponseDto[]> {
    const services = await this.prisma.governmentService.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    return services.map((service) => this.toResponse(service));
  }

  toResponse(service: GovernmentService): GovernmentServiceResponseDto {
    return {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      responsibleInstitutionId: service.responsibleInstitutionId,
      status: service.status,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
