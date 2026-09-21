import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type OfficialExperienceRequest } from '../guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../types/official-context.types';

export const CurrentOfficialContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ResolvedOfficialContext => {
    const request = context.switchToHttp().getRequest<OfficialExperienceRequest>();
    if (!request.officialContext) {
      throw new Error('Official context is unavailable; ensure OfficialExperienceGuard is applied');
    }
    return request.officialContext;
  },
);
