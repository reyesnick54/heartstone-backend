import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServicePackGovernanceLifecycleStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { ServicePackAcceptanceService } from '../governance/service-pack-acceptance.service';
import { buildServicePackVersionGovernanceFingerprint } from '../governance/service-pack-version-fingerprint.util';

export interface UpdateServicePackVersionDto {
  manifest?: Prisma.InputJsonValue;
}

@Injectable()
export class ServicePackVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ServicePacksBoundaryService,
    private readonly governanceAcceptance: ServicePackAcceptanceService,
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

    const updated = await this.prisma.servicePackVersion.update({
      where: { id },
      data: {
        manifest: dto.manifest,
        manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT,
        governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.NOT_IN_GOVERNANCE,
        status: ServicePackVersionStatus.COMPILED,
      },
    });

    await this.governanceAcceptance.invalidateAcceptanceForFingerprintChange(
      id,
      'system',
      'Manifest change materially altered version fingerprint',
    );

    return updated;
  }

  async markAccepted(id: string, acceptedByIdentityId?: string) {
    const version = await this.prisma.servicePackVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`Service pack version ${id} not found`);
    }

    const activeAcceptance = await this.prisma.servicePackAcceptanceRecord.findFirst({
      where: {
        servicePackVersionId: id,
        isActive: true,
        versionFingerprint: buildServicePackVersionGovernanceFingerprint({
          compilationFingerprint: version.compilationFingerprint,
          manifestChecksum: version.manifestChecksum,
        }),
      },
    });

    if (!activeAcceptance) {
      throw new BadRequestException(
        'Institutional acceptance record required; technical validation alone is insufficient',
      );
    }

    if (
      version.governanceLifecycleStatus !==
      ServicePackGovernanceLifecycleStatus.INSTITUTIONALLY_ACCEPTED
    ) {
      throw new BadRequestException(
        'Governance lifecycle must reach institutional acceptance before version acceptance is finalized',
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
