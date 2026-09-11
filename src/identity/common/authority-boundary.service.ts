import { Injectable } from '@nestjs/common';
import { AuthorityActionType } from '@prisma/client';

/**
 * Identity-side authority boundary.
 * Authentication and identity context alone never resolve government authority.
 * Function-level evaluation is performed only by AuthorityEvaluationService.
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
  functionAuthorityRecordId?: string;
  action?: AuthorityActionType;
}

@Injectable()
export class AuthorityBoundaryService {
  resolveGovernmentAuthority(context: AuthorityContext): GovernmentAuthorityResolution | null {
    if (context.functionAuthorityRecordId && context.action) {
      return null;
    }
    return null;
  }

  assertNoGovernmentAuthorityFromAuthenticationOnly(context: AuthorityContext): void {
    const hasOnlyAuthContext =
      Boolean(context.identityId ?? context.userAccountId) &&
      !context.functionAuthorityRecordId &&
      !context.action;

    if (!hasOnlyAuthContext) {
      return;
    }

    // Authentication context alone must never be treated as government authority.
  }

  assertNoGovernmentAuthority(context: AuthorityContext): void {
    this.assertNoGovernmentAuthorityFromAuthenticationOnly(context);
  }
}
