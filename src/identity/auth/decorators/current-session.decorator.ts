import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type SessionContextDto } from '../dto/session-context.dto';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionContextDto => {
    const request = ctx.switchToHttp().getRequest<{ session: SessionContextDto }>();
    return request.session;
  },
);
