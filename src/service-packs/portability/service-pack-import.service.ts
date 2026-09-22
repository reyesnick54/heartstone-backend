import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  ServicePackImportStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { computeManifestChecksum } from '../common/manifest/manifest-checksum.util';
import { ManifestValidatorService } from '../common/manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { ServicePackJurisdictionBindingService } from '../jurisdiction/service-pack-jurisdiction-binding.service';
import { assertPortableExportContainsNoForbiddenData } from './portable-export-sanitizer.util';
import { type ImportPortableServicePackRequest } from './portable-package.types';

export interface PortableImportResult {
  importId: string;
  servicePackId: string;
  servicePackVersionId: string;
  manifestValidationStatus: ServicePackManifestValidationStatus;
  versionStatus: ServicePackVersionStatus;
  importStatus: ServicePackImportStatus;
}

@Injectable()
export class ServicePackImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manifestValidator: ManifestValidatorService,
    private readonly boundary: ServicePacksBoundaryService,
    private readonly jurisdictionBinding: ServicePackJurisdictionBindingService,
  ) {}

  async importPortablePackage(
    request: ImportPortableServicePackRequest,
    importedByIdentityId?: string,
  ): Promise<PortableImportResult> {
    this.boundary.assertValidationDoesNotActivateServices(undefined);
    this.boundary.assertValidationDoesNotCreateDecisions(
      request.package.manifest as unknown as Record<string, unknown>,
    );
    assertPortableExportContainsNoForbiddenData(request.package);

    const schemaResult = this.manifestValidator.validateManifest(request.package.manifest);
    if (!schemaResult.valid || !schemaResult.manifestVersion) {
      throw new ConflictException({
        message: 'Imported portable package failed structural validation',
        issues: schemaResult.issues,
      });
    }

    const manifest = request.package.manifest;
    const versionLabel = manifest.servicePack.versionLabel;
    const manifestChecksum = computeManifestChecksum(manifest);

    return this.prisma.$transaction(async (tx) => {
      let servicePack = request.targetServicePackId
        ? await tx.servicePack.findUnique({ where: { id: request.targetServicePackId } })
        : null;

      if (request.targetServicePackId && !servicePack) {
        throw new ConflictException(`Target service pack ${request.targetServicePackId} not found`);
      }

      servicePack ??= await tx.servicePack.create({
        data: {
          code: `${manifest.servicePack.code}-import-${String(Date.now())}`,
          name: manifest.servicePack.name,
          description: manifest.servicePack.description,
          institutionId: request.targetInstitutionId,
          jurisdictionId: request.targetJurisdictionId,
          departmentCode: manifest.department?.code,
        },
      });

      await this.jurisdictionBinding.ensureOperationalBinding(tx, {
        servicePackId: servicePack.id,
        jurisdictionId: request.targetJurisdictionId,
        authorityMappingsRevalidationRequired: true,
      });

      const importRecord = await tx.servicePackImport.create({
        data: {
          servicePackId: servicePack.id,
          manifestPayload: request.package as unknown as Prisma.InputJsonValue,
          manifestChecksum,
          status: ServicePackImportStatus.DRAFT_IMPORTED,
          importedByIdentityId,
        },
      });

      const savedVersion = await tx.servicePackVersion.create({
        data: {
          servicePackId: servicePack.id,
          version: versionLabel,
          manifestVersion: schemaResult.manifestVersion ?? 'heartstone.service-pack/v1',
          manifest: manifest as unknown as Prisma.InputJsonValue,
          manifestChecksum,
          compilationFingerprint: manifestChecksum,
          manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT_IMPORTED,
          status: ServicePackVersionStatus.COMPILED,
          acceptedAt: null,
          acceptedByIdentityId: null,
        },
      });

      await tx.servicePackImport.update({
        where: { id: importRecord.id },
        data: { servicePackVersionId: savedVersion.id },
      });

      return {
        importId: importRecord.id,
        servicePackId: servicePack.id,
        servicePackVersionId: savedVersion.id,
        manifestValidationStatus: savedVersion.manifestValidationStatus,
        versionStatus: savedVersion.status,
        importStatus: ServicePackImportStatus.DRAFT_IMPORTED,
      };
    });
  }

  verifyImportedPackageNotOperational(result: PortableImportResult): void {
    if (result.versionStatus === ServicePackVersionStatus.ACCEPTED) {
      throw new ConflictException('Imported service pack must not be automatically accepted');
    }
    if (result.manifestValidationStatus !== ServicePackManifestValidationStatus.DRAFT_IMPORTED) {
      throw new ConflictException(
        'Imported service pack must remain in DRAFT_IMPORTED validation state',
      );
    }
    if (result.importStatus !== ServicePackImportStatus.DRAFT_IMPORTED) {
      throw new ConflictException(
        'Imported service pack must remain in DRAFT_IMPORTED import state',
      );
    }
  }
}
