export const ABSEZ_S18F_NON_PRODUCTION_MARKER = 'NON_PRODUCTION_ABSEZ_S18F';

export const ABSEZ_CUSTOMS_DELEGATED_FUNCTION_CODE = 'ABSEZ-FN-CUSTOMS-FACILITATION';

export const ABSEZ_IMMIGRATION_DELEGATED_FUNCTION_CODE = 'ABSEZ-FN-CITIZENSHIP-RESIDENCY-FACILITATION';

export const FREE_ZONE_CUSTOMS_CASE_REFERENCE_PREFIX = 'FZ-CUS';

export const INVESTOR_RESIDENCY_PROGRAM_CODE_PREFIX = 'ABSEZ-INV-RES';

export const ZONE_LAND_LEASE_REFERENCE_PREFIX = 'ZL-LEASE';

export const INVESTOR_INQUIRY_REFERENCE_PREFIX = 'INV-INQ';

export const S18F_BOUNDARY_DISCLAIMERS = {
  customsCoordinationNotClearance:
    'Free-zone customs coordination records administrative liaison only; national customs determines clearance.',
  paymentNotResidency:
    'Investment or fee payment does not grant residency, citizenship, or immigration status.',
  leaseNotPlanning:
    'Zone land lease or concession records occupancy rights only; it does not imply planning permission or building approval.',
  configuredNotOperational:
    'Configured service paths are not institutionally operational until governing authority and activation gates are satisfied.',
} as const;
