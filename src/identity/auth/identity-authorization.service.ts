import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrincipalKind, UserAccountKind } from '@prisma/client';

import { AuthenticatedPrincipal } from './principal.types';

@Injectable()
export class IdentityAuthorizationService {
  assertIdentityAdministrator(principal: AuthenticatedPrincipal): void {
    if (
      principal.kind !== PrincipalKind.USER_ACCOUNT ||
      principal.accountKind !== UserAccountKind.IDENTITY_ADMINISTRATOR
    ) {
      throw new ForbiddenException('Identity administrator privileges are required');
    }
  }

  assertUserAccount(principal: AuthenticatedPrincipal): void {
    if (principal.kind !== PrincipalKind.USER_ACCOUNT || !principal.personId) {
      throw new ForbiddenException('User account context is required');
    }
  }

  requirePersonId(principal: AuthenticatedPrincipal): string {
    this.assertUserAccount(principal);

    if (!principal.personId) {
      throw new ForbiddenException('User account context is required');
    }

    return principal.personId;
  }
}
