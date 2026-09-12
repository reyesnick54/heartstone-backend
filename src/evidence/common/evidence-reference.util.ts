export function generateEvidenceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `EVD-${String(year)}-${String(sequence).padStart(6, '0')}`;
}

export function generateAdministrativeFileReference(sequence: number): string {
  const year = new Date().getFullYear();
  return `MAF-${String(year)}-${String(sequence).padStart(6, '0')}`;
}
