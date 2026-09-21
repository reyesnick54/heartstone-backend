import { createHash } from 'node:crypto';

import { type ServicePackManifest } from './service-pack-deployment.types';

export interface ServicePackConfigurationFingerprintInput {
  servicePackVersionId: string;
  servicePackVersionLabel: string;
  compilationFingerprint: string;
  entries: {
    domain: string;
    entityId: string;
    entityVersion?: string;
  }[];
}

export function buildServicePackConfigurationFingerprint(
  input: ServicePackConfigurationFingerprintInput,
): string {
  const payload = {
    servicePackVersionId: input.servicePackVersionId,
    servicePackVersionLabel: input.servicePackVersionLabel,
    compilationFingerprint: input.compilationFingerprint,
    entries: [...input.entries]
      .map((entry) => ({
        domain: entry.domain,
        entityId: entry.entityId,
        entityVersion: entry.entityVersion ?? null,
      }))
      .sort((left, right) => {
        const domainCompare = left.domain.localeCompare(right.domain);
        if (domainCompare !== 0) {
          return domainCompare;
        }
        return left.entityId.localeCompare(right.entityId);
      }),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function buildServicePackConfigurationFingerprintFromManifest(
  manifest: ServicePackManifest,
): string {
  return buildServicePackConfigurationFingerprint({
    servicePackVersionId: manifest.servicePackVersionId,
    servicePackVersionLabel: manifest.servicePackVersionLabel,
    compilationFingerprint: manifest.compilationFingerprint,
    entries: manifest.entries.map((entry) => ({
      domain: entry.domain,
      entityId: entry.entityId,
      entityVersion: entry.entityVersion,
    })),
  });
}
