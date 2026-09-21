import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type ResolvedPlatformAdminContext } from '../types/platform-admin-context.types';

export interface PlatformAdminExperienceRequest {
  platformAdminContext?: ResolvedPlatformAdminContext;
}

export const CurrentPlatformAdminContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedPlatformAdminContext => {
    const request = ctx.switchToHttp().getRequest<PlatformAdminExperienceRequest>();
    if (!request.platformAdminContext) {
      throw new Error('Platform admin context is not available on this request');
    }
    return request.platformAdminContext;
  },
);
