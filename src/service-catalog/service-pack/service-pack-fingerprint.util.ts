import { createHash } from 'node:crypto';

import { type ServicePackManifest } from './service-pack.types';

function sortKeys<T extends object>(obj: T): T {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (obj as Record<string, unknown>)[key];
      return acc;
    }, {});
  return sorted as T;
}

function canonicalizeManifest(manifest: ServicePackManifest): string {
  const normalized = {
    manifestVersion: manifest.manifestVersion,
    packCode: manifest.packCode,
    packLabel: manifest.packLabel,
    jurisdictionCode: manifest.jurisdictionCode,
    institutionCode: manifest.institutionCode,
    services: [...manifest.services]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((service) => sortKeys(service)),
    forms: [...(manifest.forms ?? [])]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((form) => sortKeys(form)),
    workflows: [...(manifest.workflows ?? [])]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((workflow) => sortKeys(workflow)),
  };

  return JSON.stringify(normalized);
}

export function buildServicePackConfigurationFingerprint(manifest: ServicePackManifest): string {
  return createHash('sha256').update(canonicalizeManifest(manifest)).digest('hex');
}

export function buildAuthoritativeConfigurationFingerprint(
  authoritativeConfig: Record<string, unknown>,
): string {
  const sorted = JSON.stringify(sortKeys(authoritativeConfig));
  return createHash('sha256').update(sorted).digest('hex');
}
