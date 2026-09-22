export const DRIVER_PROFILE_NUMBER_PREFIX = 'DRVP';
export const DRIVER_LICENSE_APPLICATION_PROFILE_NUMBER_PREFIX = 'DLAP';
export const DRIVER_LICENSE_NUMBER_PREFIX = 'DLR';
export const DRIVER_TEST_REFERENCE_PREFIX = 'DTST';
export const DRIVER_MEDICAL_REFERENCE_PREFIX = 'DMED';
export const VEHICLE_REFERENCE_NUMBER_PREFIX = 'VHCL';
export const VEHICLE_REGISTRATION_NUMBER_PREFIX = 'VREG';
export const VEHICLE_TRANSFER_REFERENCE_PREFIX = 'VXFR';
export const TRANSPORTATION_REGISTRY_NUMBER_PREFIX = 'TRG';
export const TRANSPORT_OPERATOR_REFERENCE_PREFIX = 'TOPR';
export const FLEET_REFERENCE_NUMBER_PREFIX = 'FLTR';

export const TRANSPORTATION_BOUNDARY_DISCLAIMER =
  'Transportation application submission records a request only; it does not issue a driver license, vehicle registration, or transport permit.';

export const FORBIDDEN_AI_TRANSPORTATION_ACTIONS = [
  'APPROVE_DRIVER_LICENSE',
  'ISSUE_DRIVER_LICENSE',
  'APPROVE_VEHICLE_REGISTRATION',
  'REVOKE_DRIVER_LICENSE',
  'FINALIZE_TRANSPORTATION_DECISION',
] as const;

export const FORBIDDEN_MEDICAL_DETAIL_FIELDS = [
  'diagnosis',
  'diagnosisCode',
  'clinicalFindings',
  'medicalNotes',
  'icdCode',
  'conditionDescription',
] as const;

export const PUBLIC_VEHICLE_VERIFICATION_ALLOWED_FIELDS = [
  'verificationState',
  'registrationStatusLabel',
  'vehicleCategoryCode',
  'jurisdictionCode',
  'disclaimer',
] as const;

export const TRANSPORTATION_INVARIANTS = {
  applicationNotLicense: true,
  testPassNotIssuance: true,
  paymentNotIssuance: true,
  transferPreservesHistory: true,
  inspectionNotSilentRevocation: true,
  medicalDetailsNotInDomain: true,
  fleetRequiresOrganizationScope: true,
} as const;

export type FleetAuthorizedScope = Partial<
  Record<'viewFleetVehicles' | 'manageFleetVehicles' | 'viewOperatorPermits', boolean>
>;
