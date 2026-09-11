import { Injectable } from '@nestjs/common';

/**
 * Phase 3 authority boundary: governmental decision authority is NOT evaluated.
 * This service always returns null — no authority can be resolved until Phase 4.
 */
export interface GovernmentAuthorityResolution {
  hasGovernmentAuthority: false;
  reason: string;
}

export interface AuthorityContext {
  identityId?: string;
  userAccountId?: string;
  officeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
  organizationId?: string;
  representativeAuthorityId?: string;
  assuranceLevel?: string;
  externalClaims?: Record<string, unknown>;
}

@Injectable()
export class AuthorityBoundaryService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Phase 4 will evaluate context
  resolveGovernmentAuthority(_context: AuthorityContext): GovernmentAuthorityResolution | null {
    return null;
  }

  assertNoGovernmentAuthority(context: AuthorityContext): void {
    const resolution = this.resolveGovernmentAuthority(context);
    if (resolution !== null) {
      throw new Error('Government authority must not be resolved in Phase 3');
    }
  }
}
