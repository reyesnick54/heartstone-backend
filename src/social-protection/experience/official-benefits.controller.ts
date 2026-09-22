import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { OfficialBenefitsProjectionService } from './services/official-benefits-projection.service';

@ApiTags('official-benefits-experience')
@Controller('experience/official/benefits')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialBenefitsController {
  constructor(private readonly projections: OfficialBenefitsProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Official benefits workspace queues (authority-aware, NON_PRODUCTION)' })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }

  @Get('awards/:id/available-actions')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Benefit award actions with execution-time authority evaluation' })
  getAvailableActions(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) benefitAwardId: string,
  ) {
    return this.projections.getAvailableActions(context, benefitAwardId);
  }
}
