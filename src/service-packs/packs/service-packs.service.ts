import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServicePackImportStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SUPPORTED_MANIFEST_VERSIONS } from '../common/manifest/manifest.constants';
import { computeManifestChecksum } from '../common/manifest/manifest-checksum.util';
import { ManifestValidatorService } from '../common/manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { CreateServicePackDto } from './dto/create-service-pack.dto';
import { ImportServicePackManifestDto } from './dto/import-service-pack-manifest.dto';

export interface ImportManifestResult {
  importId: string;
  servicePackVersionId: string;
  version: string;
  manifestChecksum: string;
  manifestValidationStatus: ServicePackManifestValidationStatus;
  status: ServicePackVersionStatus;
}

@Injectable()
export class ServicePacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manifestValidator: ManifestValidatorService,
    private readonly boundary: ServicePacksBoundaryService,
  ) {}

  async create(dto: CreateServicePackDto) {
    if (!dto.institutionId) {
      throw new ConflictException('institutionId is required for service pack identity');
    }

    try {
      return await this.prisma.servicePack.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          institutionId: dto.institutionId,
          jurisdictionId: dto.jurisdictionId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Service pack code "${dto.code}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string) {
    const pack = await this.prisma.servicePack.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!pack) {
      throw new NotFoundException(`Service pack ${id} not found`);
    }
    return pack;
  }

  async findByCode(code: string) {
    const pack = await this.prisma.servicePack.findUnique({
      where: { code },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!pack) {
      throw new NotFoundException(`Service pack ${code} not found`);
    }
    return pack;
  }

  async importManifest(
    servicePackId: string,
    dto: ImportServicePackManifestDto,
    importedByIdentityId?: string,
  ): Promise<ImportManifestResult> {
    const pack = await this.prisma.servicePack.findUnique({ where: { id: servicePackId } });
    if (!pack) {
      throw new NotFoundException(`Service pack ${servicePackId} not found`);
    }

    this.boundary.assertValidationDoesNotActivateServices(undefined);
    this.boundary.assertValidationDoesNotCreateDecisions(dto.manifest);
    this.boundary.assertManifestAuthorityNotAutoValid(dto.manifest);

    const schemaResult = this.manifestValidator.validateManifest(dto.manifest);
    if (!schemaResult.valid || !schemaResult.manifestVersion) {
      throw new ConflictException({
        message: 'Manifest failed structural validation',
        issues: schemaResult.issues,
      });
    }

    const manifestVersion = schemaResult.manifestVersion;
    const servicePackSection = dto.manifest.servicePack as Record<string, unknown>;
    const version = String(servicePackSection.versionLabel);
    const manifestChecksum = computeManifestChecksum(dto.manifest);

    const existingVersion = await this.prisma.servicePackVersion.findUnique({
      where: {
        servicePackId_version: {
          servicePackId,
          version,
        },
      },
    });

    if (existingVersion) {
      this.boundary.assertNewVersionRequiredForModification(existingVersion.status);
    }

    return this.prisma.$transaction(async (tx) => {
      const importRecord = await tx.servicePackImport.create({
        data: {
          servicePackId,
          manifestPayload: dto.manifest as Prisma.InputJsonValue,
          manifestChecksum,
          status: ServicePackImportStatus.RECEIVED,
          importedByIdentityId,
        },
      });

      const savedVersion = existingVersion
        ? await tx.servicePackVersion.update({
            where: { id: existingVersion.id },
            data: {
              manifestVersion,
              manifest: dto.manifest as Prisma.InputJsonValue,
              manifestChecksum,
              compilationFingerprint: manifestChecksum,
              manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT,
              status: ServicePackVersionStatus.COMPILED,
            },
          })
        : await tx.servicePackVersion.create({
            data: {
              servicePackId,
              version,
              manifestVersion,
              manifest: dto.manifest as Prisma.InputJsonValue,
              manifestChecksum,
              compilationFingerprint: manifestChecksum,
              manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT,
              status: ServicePackVersionStatus.COMPILED,
            },
          });

      await tx.servicePackImport.update({
        where: { id: importRecord.id },
        data: { servicePackVersionId: savedVersion.id },
      });

      return {
        importId: importRecord.id,
        servicePackVersionId: savedVersion.id,
        version: savedVersion.version,
        manifestChecksum,
        manifestValidationStatus: savedVersion.manifestValidationStatus,
        status: savedVersion.status,
      };
    });
  }

  supportedManifestVersions(): readonly string[] {
    return SUPPORTED_MANIFEST_VERSIONS;
  }
}
