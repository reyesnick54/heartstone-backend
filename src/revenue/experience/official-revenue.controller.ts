import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { OfficialRevenueProjectionService } from './services/official-revenue-projection.service';

@ApiTags('official-revenue-experience')
@Controller('experience/official/revenue')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialRevenueController {
  constructor(private readonly projections: OfficialRevenueProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Official revenue workspace queues (role-aware, NON_PRODUCTION template)',
  })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }
}
