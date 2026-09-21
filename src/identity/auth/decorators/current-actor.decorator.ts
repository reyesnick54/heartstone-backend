import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type ActorContext } from '../context/actor-context.types';

/**
 * Server-derived authenticated actor for protected routes.
 * Populated by SessionAuthGuard from validated session state — never from client payload.
 * Contains identity and institutional relationship facts only; never legal authority conclusions.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const request = ctx.switchToHttp().getRequest<{ actor: ActorContext }>();
    return request.actor;
  },
);
