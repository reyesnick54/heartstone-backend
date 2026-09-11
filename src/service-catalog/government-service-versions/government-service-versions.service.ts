import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { IMMUTABLE_PUBLISHED_MATURITY_STATUSES } from '../service-catalog.constants';
import { CreateGovernmentServiceVersionDto } from './dto/create-government-service-version.dto';
import { GovernmentServiceVersionResponseDto } from './dto/government-service-version-response.dto';
import { UpdateGovernmentServiceVersionDto } from './dto/update-government-service-version.dto';

type VersionWithCategories = Prisma.GovernmentServiceVersionGetPayload<{
  include: { applicantCategories: true };
}>;

@Injectable()
export class GovernmentServiceVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(
    governmentServiceId: string,
    dto: CreateGovernmentServiceVersionDto,
  ): Promise<GovernmentServiceVersionResponseDto> {
    await this.validation.ensureGovernmentServiceExists(governmentServiceId);

    const version = await this.prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId,
        version: dto.version,
        purpose: dto.purpose,
        coveredActivities: dto.coveredActivities,
        excludedActivities: dto.excludedActivities,
        geographicScope: dto.geographicScope,
        publicDescription: dto.publicDescription,
        typicalValidityDescription: dto.typicalValidityDescription,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
        informationLastVerifiedAt: dto.informationLastVerifiedAt,
        maturityStatus: GovernmentServiceMaturityStatus.DRAFT,
        publicAvailability: dto.publicAvailability ?? GovernmentServicePublicAvailability.HIDDEN,
        applicantCategories: dto.applicantCategories
          ? {
              create: dto.applicantCategories.map((category) => ({ category })),
            }
          : undefined,
      },
      include: { applicantCategories: true },
    });

    return this.toResponse(version);
  }

  async findAllForService(
    governmentServiceId: string,
  ): Promise<GovernmentServiceVersionResponseDto[]> {
    await this.validation.ensureGovernmentServiceExists(governmentServiceId);

    const versions = await this.prisma.governmentServiceVersion.findMany({
      where: { governmentServiceId },
      include: { applicantCategories: true },
      orderBy: [{ createdAt: 'asc' }, { version: 'asc' }],
    });

    return versions.map((version) => this.toResponse(version));
  }

  async findOne(id: string): Promise<GovernmentServiceVersionResponseDto> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id },
      include: { applicantCategories: true },
    });

    if (!version) {
      throw new NotFoundException(`Government service version with id "${id}" was not found`);
    }

    return this.toResponse(version);
  }

  async update(
    id: string,
    dto: UpdateGovernmentServiceVersionDto,
  ): Promise<GovernmentServiceVersionResponseDto> {
    const existing = await this.prisma.governmentServiceVersion.findUnique({
      where: { id },
      include: { applicantCategories: true },
    });

    if (!existing) {
      throw new NotFoundException(`Government service version with id "${id}" was not found`);
    }

    this.assertVersionMutable(existing.maturityStatus, dto);
    this.assertNoClientLifecycleMutation(dto);

    const { applicantCategories, ...versionData } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (applicantCategories !== undefined) {
        await tx.governmentServiceVersionApplicantCategory.deleteMany({
          where: { governmentServiceVersionId: id },
        });

        if (applicantCategories.length > 0) {
          await tx.governmentServiceVersionApplicantCategory.createMany({
            data: applicantCategories.map((category) => ({
              governmentServiceVersionId: id,
              category,
            })),
          });
        }
      }

      return tx.governmentServiceVersion.update({
        where: { id },
        data: versionData,
        include: { applicantCategories: true },
      });
    });

    return this.toResponse(updated);
  }

  private assertNoClientLifecycleMutation(dto: UpdateGovernmentServiceVersionDto): void {
    const body = dto as Record<string, unknown>;
    for (const field of ['maturityStatus', 'publicAvailability', 'activated', 'eligible']) {
      if (field in body) {
        throw new BadRequestException(`Client-supplied "${field}" is not accepted`);
      }
    }
  }

  private assertVersionMutable(
    currentStatus: GovernmentServiceMaturityStatus,
    dto: UpdateGovernmentServiceVersionDto,
  ): void {
    const isPublished = IMMUTABLE_PUBLISHED_MATURITY_STATUSES.includes(
      currentStatus as (typeof IMMUTABLE_PUBLISHED_MATURITY_STATUSES)[number],
    );

    if (!isPublished) {
      return;
    }

    const structuralFields: (keyof UpdateGovernmentServiceVersionDto)[] = [
      'purpose',
      'coveredActivities',
      'excludedActivities',
      'geographicScope',
      'publicDescription',
      'typicalValidityDescription',
      'effectiveFrom',
      'effectiveUntil',
      'informationLastVerifiedAt',
      'applicantCategories',
    ];

    const hasStructuralChange = structuralFields.some((field) => dto[field] !== undefined);

    if (hasStructuralChange) {
      throw new BadRequestException(
        `Published service version in maturity status "${currentStatus}" cannot be modified in place; create a new version instead`,
      );
    }
  }

  private toResponse(version: VersionWithCategories): GovernmentServiceVersionResponseDto {
    return {
      id: version.id,
      governmentServiceId: version.governmentServiceId,
      version: version.version,
      purpose: version.purpose,
      coveredActivities: version.coveredActivities,
      excludedActivities: version.excludedActivities,
      geographicScope: version.geographicScope,
      publicDescription: version.publicDescription,
      typicalValidityDescription: version.typicalValidityDescription,
      effectiveFrom: version.effectiveFrom,
      effectiveUntil: version.effectiveUntil,
      informationLastVerifiedAt: version.informationLastVerifiedAt,
      maturityStatus: version.maturityStatus,
      publicAvailability: version.publicAvailability,
      applicantCategories: version.applicantCategories.map((entry) => entry.category),
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
