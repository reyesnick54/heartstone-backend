import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthenticatedPrincipal } from './principal.types';

@Injectable()
export class IdentityAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ principal?: AuthenticatedPrincipal }>();
    const principal = request.principal;

    if (!principal) {
      return false;
    }

    this.authService.assertIdentityAdministrator(principal);
    return true;
  }
}
