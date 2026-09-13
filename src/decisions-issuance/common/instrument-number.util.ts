export interface NumberingContext {
  institutionCode: string;
  year: number;
  sequence: number;
}

export function formatInstrumentNumber(pattern: string, context: NumberingContext): string {
  return pattern
    .replace(/\{INST\}/g, context.institutionCode)
    .replace(/\{YEAR\}/g, String(context.year))
    .replace(/\{SEQ(?::(\d+))?\}/g, (_match, width?: string) => {
      const padWidth = width ? Number.parseInt(width, 10) : 6;
      return String(context.sequence).padStart(padWidth, '0');
    });
}
