import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { OfficialPlanningConstructionProjectionService } from './services/official-planning-construction-projection.service';

@ApiTags('official-planning-construction-experience')
@Controller('experience/official/planning-construction')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialPlanningConstructionController {
  constructor(private readonly projections: OfficialPlanningConstructionProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Planning & construction official workspace queues (NON_PRODUCTION template)',
  })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }
}
