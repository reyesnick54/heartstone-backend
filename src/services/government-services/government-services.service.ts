import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentService,
  GovernmentServiceVersion,
  GovernmentServiceVersionStatus,
  ServiceRequirementEffectiveState,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceChecklistService } from '../checklist/service-checklist.service';

export interface CreateGovernmentServiceInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateGovernmentServiceVersionInput {
  governmentServiceId: string;
  versionLabel: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

@Injectable()
export class GovernmentServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checklist: ServiceChecklistService,
  ) {}

  async createService(input: CreateGovernmentServiceInput): Promise<GovernmentService> {
    return this.prisma.governmentService.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
  }

  async createVersion(
    input: CreateGovernmentServiceVersionInput,
  ): Promise<GovernmentServiceVersion> {
    const service = await this.prisma.governmentService.findUnique({
      where: { id: input.governmentServiceId },
    });

    if (!service) {
      throw new NotFoundException(
        `Government service "${input.governmentServiceId}" was not found`,
      );
    }

    return this.prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: input.governmentServiceId,
        versionLabel: input.versionLabel,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      },
    });
  }

  async publishVersion(serviceVersionId: string): Promise<GovernmentServiceVersion> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: serviceVersionId },
    });

    if (!version) {
      throw new NotFoundException(`Government service version "${serviceVersionId}" was not found`);
    }

    if (version.status === GovernmentServiceVersionStatus.PUBLISHED) {
      return version;
    }

    const activeRequirementCount = await this.prisma.serviceRequirement.count({
      where: {
        serviceVersionId,
        effectiveState: ServiceRequirementEffectiveState.ACTIVE,
      },
    });

    if (activeRequirementCount === 0) {
      throw new BadRequestException(
        'Cannot publish a service version without an approved active requirement set',
      );
    }

    return this.prisma.governmentServiceVersion.update({
      where: { id: serviceVersionId },
      data: {
        status: GovernmentServiceVersionStatus.PUBLISHED,
        publishedAt: new Date(),
        isImmutable: true,
      },
    });
  }

  async findVersion(serviceVersionId: string): Promise<GovernmentServiceVersion> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: serviceVersionId },
    });

    if (!version) {
      throw new NotFoundException(`Government service version "${serviceVersionId}" was not found`);
    }

    return version;
  }

  assertVersionMutable(version: GovernmentServiceVersion, action: string): void {
    this.checklist.assertPublishedVersionImmutable(version.isImmutable, action);
  }
}
