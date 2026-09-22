import { PropertyRegistryAccessClassification } from '@prisma/client';

export const PROPERTY_REGISTRY_API_TAG = 'property-registry';

export const LAND_PARCEL_REFERENCE_PREFIX = 'LP';

export const PROPERTY_RECORD_REFERENCE_PREFIX = 'PR';

export const TITLE_RECORD_REFERENCE_PREFIX = 'TR';

export const PROPERTY_TRANSFER_REFERENCE_PREFIX = 'PT';

export const PROPERTY_REGISTRY_ENTRY_REFERENCE_PREFIX = 'PRE';

export const PROPERTY_ENCUMBRANCE_REFERENCE_PREFIX = 'PE';

export const PROPERTY_CORRECTION_REFERENCE_PREFIX = 'PRC';

export const PLATFORM_ADMIN_ROLE_MARKER = 'PLATFORM_ADMINISTRATIVE_ACCESS';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';

export const FORBIDDEN_CLIENT_TRANSFER_FIELDS = [
  'applicationStatus',
  'transferFeePaymentTransactionId',
  'titleRecordId',
] as const;

export const FORBIDDEN_CLIENT_TITLE_HOLDER_FIELDS = [
  'isCurrent',
  'effectiveTo',
  'personId',
  'organizationId',
  'identityId',
] as const;

export const FORBIDDEN_CLIENT_REGISTRY_ENTRY_FIELDS = [
  'status',
  'accessClassification',
  'registeredAt',
  'governmentDecisionId',
  'authorityEvaluationRecordId',
] as const;

export const OFFICIAL_TRANSFER_STATUSES = ['REGISTERED_OFFICIAL'] as const;

export const FORBIDDEN_AI_PROPERTY_REGISTRY_ACTIONS = [
  'RECORD_TITLE_TRANSFER',
  'MUTATE_TITLE_HOLDERS',
  'APPROVE_TRANSFER',
  'RELEASE_ENCUMBRANCE',
] as const;

export const HIGHLY_PROTECTED_ACCESS_CLASSIFICATIONS: PropertyRegistryAccessClassification[] = [
  PropertyRegistryAccessClassification.GOVERNMENT_RESTRICTED,
  PropertyRegistryAccessClassification.SEALED,
];

export const PROPERTY_REGISTRY_ACCESS_CLASSIFICATIONS = [
  'PUBLIC_REGISTRY',
  'SUBJECT_ACCESS',
  'AUTHORIZED_PROFESSIONAL',
  'GOVERNMENT_RESTRICTED',
  'SEALED',
] as const;

export const PROPERTY_REGISTRY_AUTHORITY_FUNCTION_CODES = {
  TRANSFER_INTAKE: 'TEMPLATE-AUTH-PROPERTY-TRANSFER-INTAKE',
  TITLE_REGISTER: 'TEMPLATE-AUTH-PROPERTY-TITLE-REGISTER',
  CORRECTION_APPROVE: 'TEMPLATE-AUTH-PROPERTY-CORRECTION-APPROVE',
  ENCUMBRANCE_RELEASE: 'TEMPLATE-AUTH-PROPERTY-ENCUMBRANCE-RELEASE',
  VERIFICATION_ATTEST: 'TEMPLATE-AUTH-PROPERTY-VERIFICATION-ATTEST',
} as const;

export const PROPERTY_REGISTRY_DISCLAIMERS = {
  templateOnly:
    'Property registry foundation is jurisdiction-neutral; legal effect is supplied through service packs and governing sources.',
  transferApplicationNotTitle:
    'A transfer application or fee payment does not change registered title until a governed registry mutation is recorded.',
  documentNotOwnership:
    'Possession of a document or certificate does not equate to legally verified ownership.',
  publicVerificationMinimal:
    'Public verification exposes only permitted registry metadata, never restricted parcel or title payload.',
} as const;
