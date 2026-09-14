export const FORBIDDEN_INTEGRATION_DEFINITION_CLIENT_FIELDS = [
  'status',
  'currentAcceptanceState',
  'acceptedAt',
  'supersededByVersionId',
] as const;

export const FORBIDDEN_INTEGRATION_VERSION_CLIENT_FIELDS = [
  'status',
  'currentAcceptanceState',
  'acceptedAt',
  'supersededByVersionId',
] as const;

export const FORBIDDEN_AUTHORITATIVE_DESIGNATION_CLIENT_FIELDS = [
  'sourceStatus',
  'designationStatus',
] as const;

export const FORBIDDEN_CREDENTIAL_RESPONSE_FIELDS = [
  'secretReference',
  'certificateReference',
] as const;

export const FORBIDDEN_TECHNICAL_CONNECTION_FIELDS = [
  'sourceStatus',
  'designationStatus',
  'currentAcceptanceState',
] as const;

export const ACTIVE_ACCEPTANCE_REQUIRED_STATES = [
  'CONFIGURED',
  'TESTED',
  'SECURITY_APPROVED',
  'PRIVACY_APPROVED',
  'INSTITUTIONALLY_ACCEPTED',
] as const;

export const INTEGRATION_ACCEPTANCE_ACTIVE_GATE_STATES = [
  'CONFIGURED',
  'TESTED',
  'SECURITY_APPROVED',
  'PRIVACY_APPROVED',
  'INSTITUTIONALLY_ACCEPTED',
] as const;

export const IMMUTABLE_ACCEPTED_VERSION_FIELDS = [
  'version',
  'sourceSystem',
  'destinationSystem',
  'direction',
  'protocol',
  'dataContractVersion',
] as const;

export const INTEGRATION_REGISTRY_DISCLAIMER =
  'Registry metadata does not constitute connectivity, acceptance, or authoritative designation.';
