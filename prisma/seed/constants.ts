/**
 * Stable identifiers for the non-production Antigua & Barbuda structural seed.
 *
 * IMPORTANT: This seed is for development/testing only. It is NOT a legal assertion
 * of governmental authority and must not imply verified appointments, statutory
 * powers, delegations, decision rights, signature rights, or legal mandates.
 */
export const SEED_MANIFEST_KEY = 'seed:phase-2h:antigua-barbuda-structural';
export const SEED_MANIFEST_VERSION = '1.0.0';

export const SAMPLE_PREFIX = 'NON_PRODUCTION-SAMPLE';
export const SAMPLE_LABEL = '[NON-PRODUCTION SAMPLE]';
export const DEVELOPMENT_LABEL = '[DEVELOPMENT]';

export const ANTIGUA_BARBUDA = {
  jurisdiction: {
    code: `${SAMPLE_PREFIX}-AG`,
    isoAlpha2: 'AG',
    isoAlpha3: 'ATG',
    name: `${SAMPLE_LABEL} Antigua and Barbuda`,
    description:
      `${DEVELOPMENT_LABEL} Sample national jurisdiction for HeartStone Phase 2 structural testing. ` +
      'Not a legal assertion of governmental authority.',
    type: 'NATIONAL' as const,
  },
  institution: {
    code: `${SAMPLE_PREFIX}-AG-GOV`,
    name: `${SAMPLE_LABEL} Sample Government of Antigua and Barbuda ${DEVELOPMENT_LABEL}`,
    description:
      'Minimal non-production institutional root for exercising Phase 2 government structure models.',
    type: 'GOVERNMENT' as const,
  },
  governmentBody: {
    code: `${SAMPLE_PREFIX}-AG-CABINET`,
    name: `${SAMPLE_LABEL} Sample Executive Council ${DEVELOPMENT_LABEL}`,
    description: 'Sample governing body placeholder — not an authoritative institutional record.',
    type: 'COUNCIL' as const,
  },
  department: {
    code: `${SAMPLE_PREFIX}-AG-ADMIN`,
    name: `${SAMPLE_LABEL} Sample Administrative Department ${DEVELOPMENT_LABEL}`,
    description: 'Sample department for structural relationship testing.',
  },
  office: {
    code: `${SAMPLE_PREFIX}-AG-DIR-GEN`,
    name: `${SAMPLE_LABEL} Sample Director General Office ${DEVELOPMENT_LABEL}`,
    description: 'Sample office independent of any real officeholder identity.',
  },
  officeholders: {
    primary: {
      code: `${SAMPLE_PREFIX}-OH-001`,
      displayName: 'Sample Officeholder 001',
      description: 'Non-production sample officeholder — not a real person.',
    },
    delegate: {
      code: `${SAMPLE_PREFIX}-OH-002`,
      displayName: 'Sample Officeholder 002',
      description: 'Non-production sample delegate recipient — not a real person.',
    },
  },
  appointment: {
    code: `${SAMPLE_PREFIX}-AG-APPT-001`,
    notes:
      'Sample appointment for development testing only. Does not assert verified appointment or legal mandate.',
  },
  delegation: {
    code: `${SAMPLE_PREFIX}-AG-DEL-001`,
    scopeDescription:
      'Sample bounded delegation scope for structural testing only. No legal authority is conferred.',
    notes: 'Development sample delegation — not evidence of statutory delegation.',
  },
  externalAuthority: {
    code: `${SAMPLE_PREFIX}-EXT-CARICOM-REF`,
    name: `${SAMPLE_LABEL} Sample Regional Coordination Authority ${DEVELOPMENT_LABEL}`,
    description:
      'Sample external authority placeholder for relationship testing. Not an official registry entry.',
    type: 'INTERNATIONAL' as const,
  },
  institutionExternalAuthority: {
    code: `${SAMPLE_PREFIX}-AG-EXT-LINK-001`,
    relationshipType: 'COORDINATION' as const,
    description:
      'Sample institution-to-external-authority relationship for development testing only.',
  },
} as const;
