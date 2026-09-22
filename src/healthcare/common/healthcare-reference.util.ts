export function buildHealthcareReference(prefix: string, seed: string): string {
  const normalized = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${prefix}-${normalized.slice(0, 12) || 'REF'}`;
}
