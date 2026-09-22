import type { ServicePackManifestV1 } from '../common/manifest/manifest.types';

export type PortableExportPurpose =
  'BACKUP' | 'AUDIT' | 'CONTROLLED_PORTABILITY' | 'TEMPLATE_REUSE' | 'ENVIRONMENT_PROMOTION';

export interface PortableServicePackExportMetadata {
  exportPurpose: PortableExportPurpose;
  exportedAt: string;
  sourceServicePackId: string;
  sourceServicePackVersionId: string;
  sourceJurisdictionId: string | null;
  sourceInstitutionId: string;
  packageFingerprint: string;
  manifestChecksum: string;
  containsOperationalData: false;
  containsSecrets: false;
}

export interface PortableServicePackExportPackage {
  exportVersion: 'heartstone.service-pack.export/v1';
  metadata: PortableServicePackExportMetadata;
  manifest: ServicePackManifestV1;
  dependencySummaries: {
    dependencyCode: string;
    dependencyKind: string;
    referenceKind: string;
    referenceCode?: string;
    controlScope?: string;
    isRequired?: boolean;
  }[];
}

export interface ImportPortableServicePackRequest {
  targetServicePackId?: string;
  targetInstitutionId: string;
  targetJurisdictionId: string;
  package: PortableServicePackExportPackage;
}

export interface CloneServicePackTemplateRequest {
  sourceServicePackId: string;
  sourceVersionId: string;
  targetInstitutionId: string;
  targetJurisdictionId: string;
  targetPackCode: string;
  targetPackName: string;
  responsibleOwnerIdentityId?: string;
}
