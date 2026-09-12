import { createHash } from 'node:crypto';

export interface ManifestItemEntry {
  itemId: string;
  evidenceRecordId: string;
  evidenceStatusAtInclusion: string;
  documentVersionId: string;
  documentContentHash: string;
  inclusionOrder: number;
  isExplicitlyExcluded: boolean;
  exclusionRecordId: string | null;
  verificationRecordIds: string[];
  acceptanceRecordIds: string[];
  departmentalReviewId: string | null;
  governmentCommunicationId: string | null;
  professionalReviewId: string | null;
  inspectionRecordId: string | null;
  sourceCitationId: string | null;
  limitations: string | null;
}

export interface ManifestExclusionEntry {
  exclusionId: string;
  evidenceRecordId: string;
  exclusionReason: string;
  authorizedByIdentityId: string;
}

export interface CanonicalManifest {
  packetVersionId: string;
  packetId: string;
  version: number;
  evidenceCutoffAt: string | null;
  items: ManifestItemEntry[];
  exclusions: ManifestExclusionEntry[];
}

function sortKeys<T extends object>(obj: T): T {
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (obj as Record<string, unknown>)[key];
      return acc;
    }, {});
  return sorted as T;
}

export function canonicalizeManifest(manifest: CanonicalManifest): string {
  const normalized = {
    packetVersionId: manifest.packetVersionId,
    packetId: manifest.packetId,
    version: manifest.version,
    evidenceCutoffAt: manifest.evidenceCutoffAt,
    items: [...manifest.items]
      .sort((a, b) => a.inclusionOrder - b.inclusionOrder)
      .map((item) => sortKeys(item)),
    exclusions: [...manifest.exclusions]
      .sort((a, b) => a.exclusionId.localeCompare(b.exclusionId))
      .map((entry) => sortKeys(entry)),
  };
  return JSON.stringify(normalized);
}

export function hashManifest(manifest: CanonicalManifest): string {
  return createHash('sha256').update(canonicalizeManifest(manifest)).digest('hex');
}
