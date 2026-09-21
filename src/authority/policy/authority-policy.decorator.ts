import { SetMetadata } from '@nestjs/common';
import { type AuthorityActionType } from '@prisma/client';

export const AUTHORITY_POLICY_KEY = 'authority_policy';

export interface AuthorityPolicyMetadata {
  functionAuthorityRecordId?: string;
  functionCode?: string;
  action: AuthorityActionType;
}

/**
 * @deprecated Prefer {@link ConsequentialAction} from `consequential-action.decorator`.
 * Declares that a route requires authority evaluation before execution.
 */
export const RequiresAuthority = (metadata: AuthorityPolicyMetadata) =>
  SetMetadata(AUTHORITY_POLICY_KEY, metadata);
