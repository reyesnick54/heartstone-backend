/**
 * Qualification verification status supplied by external qualification systems.
 * Phase 4D accepts verified qualification facts without implementing a full registry.
 */
export enum QualificationVerificationStatus {
  VERIFIED = 'VERIFIED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  MISSING = 'MISSING',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}
