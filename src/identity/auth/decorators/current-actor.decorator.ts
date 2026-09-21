import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type ActorContext } from '../context/actor-context.types';

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const request = ctx.switchToHttp().getRequest<{ actor: ActorContext }>();
    return request.actor;
  },
);
