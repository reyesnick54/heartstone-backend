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

export const TRANSPORTATION_SERVICE_PACK_ID = 'template-transportation-government';

export const TRANSPORTATION_BOUNDARY_DISCLAIMER =
  'Transportation application submission records a request only; it does not issue a driver license, vehicle registration, or transport permit.';

export const TRANSPORTATION_EXPERIENCE_DISCLAIMER =
  'Transportation portal views summarize registry and application state only; they are not legal proof of license, registration, or permit unless issued through an authoritative instrument.';

export const TRANSPORTATION_PUBLIC_VERIFICATION_DISCLAIMER =
  'Public verification returns policy-permitted status facts only and must not be treated as identity proof or full registry disclosure.';

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

export const TRANSPORTATION_TEMPLATE_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-TRANSPORT-INTAKE',
  review: 'TEMPLATE-AUTH-TRANSPORT-REVIEW',
  licenseDecide: 'TEMPLATE-AUTH-TRANSPORT-LICENSE-DECIDE',
  licenseIssue: 'TEMPLATE-AUTH-TRANSPORT-LICENSE-ISSUE',
  registrationDecide: 'TEMPLATE-AUTH-TRANSPORT-REGISTRATION-DECIDE',
  inspectionVerify: 'TEMPLATE-AUTH-TRANSPORT-INSPECTION-VERIFY',
  operatorLicense: 'TEMPLATE-AUTH-TRANSPORT-OPERATOR-LICENSE',
  transferDecide: 'TEMPLATE-AUTH-TRANSPORT-TRANSFER-DECIDE',
  appealDecide: 'TEMPLATE-AUTH-TRANSPORT-APPEAL-DECIDE',
} as const;

export const TRANSPORTATION_APPOINTMENT_REASON_CODES = {
  DRIVER_TEST: 'TEMPLATE-TRANS-APPT-DRIVER-TEST',
  VEHICLE_INSPECTION: 'TEMPLATE-TRANS-APPT-VEHICLE-INSPECTION',
  IDENTITY_DOCUMENT_VERIFICATION: 'TEMPLATE-TRANS-APPT-IDENTITY-VERIFY',
} as const;

export type FleetAuthorizedScope = Partial<
  Record<'viewFleetVehicles' | 'manageFleetVehicles' | 'viewOperatorPermits', boolean>
>;
