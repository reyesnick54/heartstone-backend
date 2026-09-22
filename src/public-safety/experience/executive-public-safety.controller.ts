import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentExecutiveContext } from '../../experience/executive/decorators/current-executive-context.decorator';
import { EXECUTIVE_EXPERIENCE_API_TAG } from '../../experience/executive/executive-experience.constants';
import { ExecutiveExperienceGuard } from '../../experience/executive/guards/executive-experience.guard';
import { type ResolvedExecutiveContext } from '../../experience/executive/types/executive-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ExecutivePublicSafetyProjectionService } from './services/executive-public-safety-projection.service';

@ApiTags(EXECUTIVE_EXPERIENCE_API_TAG)
@Controller('experience/executive/public-safety')
@UseGuards(SessionAuthGuard, ExecutiveExperienceGuard)
@ApiBearerAuth()
export class ExecutivePublicSafetyController {
  constructor(private readonly projections: ExecutivePublicSafetyProjectionService) {}

  @Get()
  @ApiOperation({
    summary: 'Executive public safety briefing aggregates (read-only, non-declaratory)',
  })
  getBriefing(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.projections.buildBriefing(context);
  }
}
