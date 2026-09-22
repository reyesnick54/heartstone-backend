import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import type { ServicePackManifestV1 } from '../common/manifest/manifest.types';
import { computeManifestChecksum } from '../common/manifest/manifest-checksum.util';
import {
  assertPortableExportContainsNoForbiddenData,
  computePortablePackageFingerprint,
  sanitizePortableExportPayload,
} from './portable-export-sanitizer.util';
import {
  type PortableExportPurpose,
  type PortableServicePackExportPackage,
} from './portable-package.types';
import { ServicePackPortabilityAccessService } from './service-pack-portability-access.service';

@Injectable()
export class ServicePackExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ServicePackPortabilityAccessService,
  ) {}

  async exportVersion(input: {
    servicePackId: string;
    servicePackVersionId: string;
    exportPurpose: PortableExportPurpose;
    actor: ActorContext;
  }): Promise<PortableServicePackExportPackage> {
    const version = await this.prisma.servicePackVersion.findFirst({
      where: {
        id: input.servicePackVersionId,
        servicePackId: input.servicePackId,
      },
      include: {
        servicePack: true,
        dependencies: true,
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Service pack version ${input.servicePackVersionId} not found for pack ${input.servicePackId}`,
      );
    }

    this.access.assertCanExport(input.actor, {
      institutionId: version.servicePack.institutionId,
      exportRestriction: version.servicePack.exportRestriction,
      responsibleOwnerIdentityId: version.servicePack.responsibleOwnerIdentityId,
    });

    const manifest = sanitizePortableExportPayload(
      version.manifest as unknown as ServicePackManifestV1,
    );

    const dependencySummaries = version.dependencies.map((dependency) => ({
      dependencyCode: dependency.dependencyCode,
      dependencyKind: dependency.dependencyKind,
      referenceKind: dependency.referenceKind,
      referenceCode: dependency.referenceCode ?? undefined,
      controlScope: dependency.controlScope,
      isRequired: dependency.isRequired,
    }));

    const manifestChecksum = computeManifestChecksum(manifest);

    const metadata = {
      exportPurpose: input.exportPurpose,
      exportedAt: new Date().toISOString(),
      sourceServicePackId: version.servicePackId,
      sourceServicePackVersionId: version.id,
      sourceJurisdictionId: version.servicePack.jurisdictionId,
      sourceInstitutionId: version.servicePack.institutionId,
      manifestChecksum,
      containsOperationalData: false as const,
      containsSecrets: false as const,
      packageFingerprint: '',
    };

    const exportPackage: PortableServicePackExportPackage = {
      exportVersion: 'heartstone.service-pack.export/v1',
      metadata: {
        ...metadata,
        packageFingerprint: computePortablePackageFingerprint({
          exportVersion: 'heartstone.service-pack.export/v1',
          manifest,
          dependencySummaries,
        }),
      },
      manifest,
      dependencySummaries,
    };

    assertPortableExportContainsNoForbiddenData(exportPackage);

    return exportPackage;
  }
}
