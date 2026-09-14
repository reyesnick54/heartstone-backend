export function buildComplianceNumber(prefix: string, sequence: number): string {
  const year = String(new Date().getFullYear());
  const padded = String(sequence).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}
