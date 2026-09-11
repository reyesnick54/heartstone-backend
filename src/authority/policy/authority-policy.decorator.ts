import { SetMetadata } from '@nestjs/common';
import { type AuthorityActionType } from '@prisma/client';

export const AUTHORITY_POLICY_KEY = 'authority_policy';

export interface AuthorityPolicyMetadata {
  functionAuthorityRecordId?: string;
  functionCode?: string;
  action: AuthorityActionType;
}

/**
 * Declares that a route requires authority evaluation before execution.
 * Apply only to consequential actions — not blanket GET endpoints.
 */
export const RequiresAuthority = (metadata: AuthorityPolicyMetadata) =>
  SetMetadata(AUTHORITY_POLICY_KEY, metadata);
