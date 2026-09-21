import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type AuthenticatedPrincipal } from '../domain/authenticated-principal';
import { type SessionContextDto } from '../dto/session-context.dto';

/**
 * Server-derived authenticated actor for protected routes.
 * Identity and session facts only — never legal authority conclusions.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => {
    const request = ctx.switchToHttp().getRequest<{ session: SessionContextDto }>();
    const session = request.session;

    return {
      sessionId: session.sessionId,
      identityId: session.identityId,
      userAccountId: session.userAccountId,
      assuranceLevel: session.assuranceLevel,
    };
  },
);
