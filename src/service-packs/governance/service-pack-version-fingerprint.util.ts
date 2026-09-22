import { createHash } from 'node:crypto';

export interface ServicePackVersionFingerprintInput {
  compilationFingerprint: string;
  manifestChecksum: string | null;
}

export function buildServicePackVersionGovernanceFingerprint(
  input: ServicePackVersionFingerprintInput,
): string {
  const payload = {
    compilationFingerprint: input.compilationFingerprint,
    manifestChecksum: input.manifestChecksum ?? '',
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
