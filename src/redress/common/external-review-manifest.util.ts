import { createHash } from 'node:crypto';

export interface ExternalReviewDocumentPin {
  evidenceRecordId: string;
  documentVersionId: string;
  inclusionOrder: number;
}

export interface ExternalReviewPackageManifest {
  referralId: string;
  packageVersion: number;
  evidencePacketVersionId: string;
  evidencePacketManifestHash: string;
  routeVersion: string;
  securityClassification: string;
  documentVersionPins: ExternalReviewDocumentPin[];
}

function sortKeys<T extends object>(obj: T): T {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (obj as Record<string, unknown>)[key];
      return acc;
    }, {});
  return sorted as T;
}

export function canonicalizeExternalReviewPackageManifest(
  manifest: ExternalReviewPackageManifest,
): string {
  const normalized = {
    referralId: manifest.referralId,
    packageVersion: manifest.packageVersion,
    evidencePacketVersionId: manifest.evidencePacketVersionId,
    evidencePacketManifestHash: manifest.evidencePacketManifestHash,
    routeVersion: manifest.routeVersion,
    securityClassification: manifest.securityClassification,
    documentVersionPins: [...manifest.documentVersionPins]
      .sort((a, b) => a.inclusionOrder - b.inclusionOrder)
      .map((pin) => sortKeys(pin)),
  };
  return JSON.stringify(normalized);
}

export function hashExternalReviewPackageManifest(manifest: ExternalReviewPackageManifest): string {
  return createHash('sha256')
    .update(canonicalizeExternalReviewPackageManifest(manifest))
    .digest('hex');
}
