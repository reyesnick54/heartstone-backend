import { PlatformEnvironmentClassification } from '@prisma/client';

export const PRODUCTION_READINESS_BOUNDARY_DISCLAIMER =
  'Deployment, release acceptance, and change approval are operational governance acts. They do not create, alter, or delegate institutional authority. CI success does not authorize production deployment. Software deployment does not equal feature activation.';

export const PRODUCTION_READINESS_REASON_CODES = {
  PRODUCTION_SEMANTICS_SPOOFING_FORBIDDEN: 'PRODUCTION_SEMANTICS_SPOOFING_FORBIDDEN',
  CI_GREEN_NOT_PRODUCTION_AUTHORIZATION: 'CI_GREEN_NOT_PRODUCTION_AUTHORIZATION',
  UNSIGNED_ARTIFACT_BLOCKED: 'UNSIGNED_ARTIFACT_BLOCKED',
  ARTIFACT_DIGEST_MISMATCH: 'ARTIFACT_DIGEST_MISMATCH',
  UNACCEPTED_ARTIFACT_BLOCKED: 'UNACCEPTED_ARTIFACT_BLOCKED',
  PRODUCTION_DEPLOY_REQUIRES_APPROVAL: 'PRODUCTION_DEPLOY_REQUIRES_APPROVAL',
  PRODUCTION_CREDENTIAL_IN_NON_PRODUCTION: 'PRODUCTION_CREDENTIAL_IN_NON_PRODUCTION',
  LIVE_GOVERNMENT_ENDPOINT_IN_TEST: 'LIVE_GOVERNMENT_ENDPOINT_IN_TEST',
  PRODUCTION_DATA_TRANSFER_UNAPPROVED: 'PRODUCTION_DATA_TRANSFER_UNAPPROVED',
  DEPLOYMENT_NOT_FEATURE_ACTIVATION: 'DEPLOYMENT_NOT_FEATURE_ACTIVATION',
  EMERGENCY_CHANGE_AUTHORITY_FORBIDDEN: 'EMERGENCY_CHANGE_AUTHORITY_FORBIDDEN',
  ROLLBACK_MUST_PRESERVE_RECORDS: 'ROLLBACK_MUST_PRESERVE_RECORDS',
  IMMUTABLE_ARTIFACT_MODIFICATION: 'IMMUTABLE_ARTIFACT_MODIFICATION',
  CHANGE_BYPASS_AUTHORITY_FORBIDDEN: 'CHANGE_BYPASS_AUTHORITY_FORBIDDEN',
  MATERIAL_CHANGE_REVALIDATION_REQUIRED: 'MATERIAL_CHANGE_REVALIDATION_REQUIRED',
  EMERGENCY_CHANGE_EXPIRED: 'EMERGENCY_CHANGE_EXPIRED',
} as const;

export const PLATFORM_ENVIRONMENT_CLASSIFICATIONS: readonly PlatformEnvironmentClassification[] = [
  PlatformEnvironmentClassification.LOCAL,
  PlatformEnvironmentClassification.DEVELOPMENT,
  PlatformEnvironmentClassification.TEST,
  PlatformEnvironmentClassification.INTEGRATION,
  PlatformEnvironmentClassification.SANDBOX,
  PlatformEnvironmentClassification.STAGING,
  PlatformEnvironmentClassification.PILOT,
  PlatformEnvironmentClassification.PRODUCTION,
  PlatformEnvironmentClassification.DISASTER_RECOVERY,
];

export const PRODUCTION_CAPABLE_CLASSIFICATIONS: readonly PlatformEnvironmentClassification[] = [
  PlatformEnvironmentClassification.PRODUCTION,
  PlatformEnvironmentClassification.PILOT,
  PlatformEnvironmentClassification.DISASTER_RECOVERY,
];

export const NON_PRODUCTION_CLASSIFICATIONS: readonly PlatformEnvironmentClassification[] =
  PLATFORM_ENVIRONMENT_CLASSIFICATIONS.filter(
    (classification) => !PRODUCTION_CAPABLE_CLASSIFICATIONS.includes(classification),
  );

export const REQUIRED_CI_CHECKS = [
  'clean_checkout',
  'locked_dependencies',
  'build',
  'prisma_validation',
  'migration_testing',
  'typecheck',
  'format',
  'lint',
  'unit',
  'integration',
  'e2e',
  'security_tests',
  'artifact_digest',
  'provenance',
] as const;

export const MATERIAL_REVALIDATION_TRIGGER_TYPES = [
  'MATERIAL_CONFIGURATION_CHANGE',
  'INTEGRATION_ENDPOINT_CHANGE',
  'AI_MODEL_UPDATE',
  'AUTHORITY_POLICY_CHANGE',
  'MATERIAL_FEATURE_CHANGE',
] as const;
