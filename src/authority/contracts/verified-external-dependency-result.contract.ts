import { type ExternalDeterminationStatus } from '@prisma/client';

/**
 * Typed verified dependency-result contract for external institutional determinations.
 * Future integration layers populate these values; Phase 4 does not perform live integrations.
 */
export interface VerifiedExternalDependencyResult {
  authorityDependencyId: string;
  externalAuthorityId: string;
  determinationReference: string;
  determinationStatus: ExternalDeterminationStatus;
  effectiveDate?: Date;
  expiryDate?: Date;
  isAuthenticated: boolean;
  scope?: string;
  receivedAt: Date;
  retainedQuestion?: string;
  requiredDetermination?: string;
  referralBasis?: string;
  effectOnAbsezAction?: string;
}
