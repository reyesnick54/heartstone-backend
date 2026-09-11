import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedPrincipal } from './principal.types';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<{ principal?: AuthenticatedPrincipal }>();

    if (!request.principal) {
      throw new UnauthorizedException('Authenticated principal is required');
    }

    return request.principal;
  },
);
