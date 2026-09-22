import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServicePackImportStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { ServicePackManifestV1 } from '../common/manifest/manifest.types';
import { computeManifestChecksum } from '../common/manifest/manifest-checksum.util';
import { ServicePackJurisdictionBindingService } from '../jurisdiction/service-pack-jurisdiction-binding.service';
import { sanitizePortableExportPayload } from '../portability/portable-export-sanitizer.util';
import { type CloneServicePackTemplateRequest } from '../portability/portable-package.types';

export interface TemplateCloneResult {
  servicePackId: string;
  servicePackVersionId: string;
  importId: string;
  manifestValidationStatus: ServicePackManifestValidationStatus;
  versionStatus: ServicePackVersionStatus;
  authorityMappingsRevalidationRequired: true;
}

@Injectable()
export class ServicePackTemplateCloneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jurisdictionBinding: ServicePackJurisdictionBindingService,
  ) {}

  async cloneAsTemplate(
    request: CloneServicePackTemplateRequest,
    importedByIdentityId?: string,
  ): Promise<TemplateCloneResult> {
    const sourceVersion = await this.prisma.servicePackVersion.findFirst({
      where: {
        id: request.sourceVersionId,
        servicePackId: request.sourceServicePackId,
      },
      include: { servicePack: true },
    });

    if (!sourceVersion) {
      throw new NotFoundException('Source service pack version not found for template clone');
    }

    const templateManifest = this.buildTemplateManifest(
      sourceVersion.manifest as unknown as ServicePackManifestV1,
      request,
    );
    const manifestChecksum = computeManifestChecksum(templateManifest);

    return this.prisma.$transaction(async (tx) => {
      const clonedPack = await tx.servicePack.create({
        data: {
          code: request.targetPackCode,
          name: request.targetPackName,
          description: sourceVersion.servicePack.description,
          institutionId: request.targetInstitutionId,
          jurisdictionId: request.targetJurisdictionId,
          departmentCode: templateManifest.department?.code,
          templateSourceServicePackId: request.sourceServicePackId,
          responsibleOwnerIdentityId: request.responsibleOwnerIdentityId,
        },
      });

      await this.jurisdictionBinding.ensureOperationalBinding(tx, {
        servicePackId: clonedPack.id,
        jurisdictionId: request.targetJurisdictionId,
        authorityMappingsRevalidationRequired: true,
      });

      const importRecord = await tx.servicePackImport.create({
        data: {
          servicePackId: clonedPack.id,
          manifestPayload: templateManifest as unknown as Prisma.InputJsonValue,
          manifestChecksum,
          status: ServicePackImportStatus.DRAFT_IMPORTED,
          importedByIdentityId,
        },
      });

      const version = await tx.servicePackVersion.create({
        data: {
          servicePackId: clonedPack.id,
          version: templateManifest.servicePack.versionLabel,
          manifestVersion: sourceVersion.manifestVersion,
          manifest: templateManifest as unknown as Prisma.InputJsonValue,
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
        data: { servicePackVersionId: version.id },
      });

      if (sourceVersion.status === ServicePackVersionStatus.ACCEPTED) {
        // Cross-jurisdiction template clones never inherit legal acceptance from the source pack.
      }

      return {
        servicePackId: clonedPack.id,
        servicePackVersionId: version.id,
        importId: importRecord.id,
        manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT_IMPORTED,
        versionStatus: ServicePackVersionStatus.COMPILED,
        authorityMappingsRevalidationRequired: true,
      };
    });
  }

  private buildTemplateManifest(
    source: ServicePackManifestV1,
    request: CloneServicePackTemplateRequest,
  ): ServicePackManifestV1 {
    const sanitized = sanitizePortableExportPayload(source);

    if (!sanitized.authorityMappings?.length) {
      throw new ConflictException(
        'Template clone requires explicit authority mapping revalidation',
      );
    }

    return {
      ...sanitized,
      servicePack: {
        ...sanitized.servicePack,
        code: request.targetPackCode,
        name: request.targetPackName,
        versionLabel: `${sanitized.servicePack.versionLabel}-template`,
      },
      jurisdiction: {
        code: undefined,
        name: undefined,
        referenceId: request.targetJurisdictionId,
      },
      institution: {
        code: undefined,
        name: undefined,
        referenceId: request.targetInstitutionId,
      },
      department: sanitized.department
        ? {
            ...sanitized.department,
            referenceId: undefined,
          }
        : undefined,
      authorityMappings: sanitized.authorityMappings.map((mapping) => ({
        ...mapping,
        functionAuthorityRecordCode: `REVALIDATE:${mapping.functionAuthorityRecordCode}`,
      })),
      fees: sanitized.fees?.map((fee) => ({
        ...fee,
        description: `${fee.description ?? ''} [REVALIDATE]`,
      })),
      evidenceRequirements: sanitized.evidenceRequirements,
      integrations: sanitized.integrations?.map((integration) => ({
        ...integration,
        description: `${integration.description ?? ''} [REVALIDATE]`,
      })),
    };
  }
}
