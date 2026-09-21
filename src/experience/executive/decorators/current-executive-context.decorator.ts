import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type ResolvedExecutiveContext } from '../types/executive-context.types';

export const CurrentExecutiveContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedExecutiveContext => {
    const request = ctx.switchToHttp().getRequest<{ executiveContext: ResolvedExecutiveContext }>();
    return request.executiveContext;
  },
);
