/** Layer 1 — HeartStone platform defaults (non-jurisdiction-specific). */
export const HEARTSTONE_PLATFORM_DEFAULTS = {
  configurationNamespace: 'heartstone.platform',
  defaultLocale: 'en-AG',
  defaultTimezone: 'America/Antigua',
  authorityEvaluationMode: 'SERVER_DERIVED',
  governingSourceAuthenticationRequired: true,
  technicalAccessLevels: ['A', 'B', 'C', 'D', 'E', 'F'],
  setupInheritancePolicy: 'EXPLICIT_OVERRIDE_AUDIT',
} as const;

export const ANTIGUA_JURISDICTION_DEFAULTS = {
  configurationNamespace: 'jurisdiction.antigua-barbuda',
  isoAlpha2: 'AG',
  isoAlpha3: 'ATG',
  defaultCurrency: 'XCD',
  nationalJurisdictionCode: 'AG',
} as const;
