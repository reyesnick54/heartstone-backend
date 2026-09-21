import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';

export interface UpdateServicePackVersionDto {
  manifest?: Prisma.InputJsonValue;
}

@Injectable()
export class ServicePackVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ServicePacksBoundaryService,
  ) {}

  async findById(id: string) {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id },
      include: {
        components: true,
        dependencies: true,
        validationResults: {
          orderBy: { validatedAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!version) {
      throw new NotFoundException(`Service pack version ${id} not found`);
    }
    return version;
  }

  async update(id: string, dto: UpdateServicePackVersionDto) {
    const version = await this.prisma.servicePackVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`Service pack version ${id} not found`);
    }

    this.boundary.assertAcceptedVersionImmutable(version.immutable, version.status);
    this.boundary.assertNewVersionRequiredForModification(version.status);

    if (dto.manifest === undefined) {
      throw new BadRequestException('No updatable fields provided');
    }

    return this.prisma.servicePackVersion.update({
      where: { id },
      data: {
        manifest: dto.manifest,
        manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT,
        status: ServicePackVersionStatus.COMPILED,
      },
    });
  }

  async markAccepted(id: string, acceptedByIdentityId?: string) {
    const version = await this.prisma.servicePackVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`Service pack version ${id} not found`);
    }

    if (version.manifestValidationStatus !== ServicePackManifestValidationStatus.VALIDATED) {
      throw new BadRequestException(
        'Only manifest-validated versions may be institutionally accepted; VALIDATED != ACCEPTED until explicit acceptance',
      );
    }

    return this.prisma.servicePackVersion.update({
      where: { id },
      data: {
        status: ServicePackVersionStatus.ACCEPTED,
        immutable: true,
        acceptedAt: new Date(),
        acceptedByIdentityId,
      },
    });
  }

  isInstitutionallyAccepted(status: ServicePackVersionStatus): boolean {
    return status === ServicePackVersionStatus.ACCEPTED;
  }
}
