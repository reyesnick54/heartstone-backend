import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { OfficialEducationProjectionService } from './services/official-education-projection.service';

@ApiTags('official-education-experience')
@Controller('experience/official/education')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialEducationController {
  constructor(private readonly projections: OfficialEducationProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Official education workspace queues (NON_PRODUCTION template)' })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }
}
