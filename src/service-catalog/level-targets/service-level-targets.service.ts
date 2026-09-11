import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceLevelTarget } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import {
  isCurrentOperatingMetadata,
  slaExpiryDoesNotImplyApproval,
} from '../common/service-operating-metadata.util';
import { CreateServiceLevelTargetDto } from './dto/create-service-level-target.dto';
import { ServiceLevelTargetResponseDto } from './dto/service-level-target-response.dto';

@Injectable()
export class ServiceLevelTargetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateServiceLevelTargetDto): Promise<ServiceLevelTargetResponseDto> {
    await this.validation.assertServiceVersionExists(dto.serviceVersionId);
    if (dto.governingSourceId) {
      await this.validation.assertGoverningSourceExists(dto.governingSourceId);
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const target = await this.prisma.serviceLevelTarget.create({
      data: {
        serviceVersionId: dto.serviceVersionId,
        targetType: dto.targetType,
        targetDurationValue: dto.targetDurationValue,
        targetDurationUnit: dto.targetDurationUnit,
        clockBasis: dto.clockBasis,
        dayBasis: dto.dayBasis,
        startEventDescription: dto.startEventDescription,
        startEventReference: dto.startEventReference,
        pausable: dto.pausable ?? false,
        approvedPauseReasons: dto.approvedPauseReasons ?? [],
        externalDependencyTreatment: dto.externalDependencyTreatment,
        escalationThreshold: dto.escalationThreshold,
        governingSourceId: dto.governingSourceId,
        effectiveFrom,
        effectiveUntil,
        status: dto.status,
      },
    });

    return this.toResponse(target);
  }

  async findOne(id: string): Promise<ServiceLevelTargetResponseDto> {
    const target = await this.prisma.serviceLevelTarget.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException(`ServiceLevelTarget "${id}" was not found`);
    }
    return this.toResponse(target);
  }

  async findByServiceVersion(serviceVersionId: string): Promise<ServiceLevelTargetResponseDto[]> {
    const targets = await this.prisma.serviceLevelTarget.findMany({
      where: { serviceVersionId },
      orderBy: [{ targetType: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return targets.map((target) => this.toResponse(target));
  }

  toResponse(target: ServiceLevelTarget, at: Date = new Date()): ServiceLevelTargetResponseDto {
    const approvalState = slaExpiryDoesNotImplyApproval();

    return {
      id: target.id,
      serviceVersionId: target.serviceVersionId,
      targetType: target.targetType,
      targetDurationValue: target.targetDurationValue,
      targetDurationUnit: target.targetDurationUnit,
      clockBasis: target.clockBasis,
      dayBasis: target.dayBasis,
      startEventDescription: target.startEventDescription,
      startEventReference: target.startEventReference,
      pausable: target.pausable,
      approvedPauseReasons: target.approvedPauseReasons as string[],
      externalDependencyTreatment: target.externalDependencyTreatment,
      escalationThreshold: target.escalationThreshold,
      governingSourceId: target.governingSourceId,
      effectiveFrom: target.effectiveFrom,
      effectiveUntil: target.effectiveUntil,
      status: target.status,
      isCurrent: isCurrentOperatingMetadata(
        {
          status: target.status,
          effectiveFrom: target.effectiveFrom,
          effectiveUntil: target.effectiveUntil,
        },
        at,
      ),
      approved: approvalState.approved,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    };
  }
}
