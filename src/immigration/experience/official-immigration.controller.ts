import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import {
  OfficialImmigrationAvailableActionsResponseDto,
  OfficialImmigrationWorkspaceResponseDto,
} from './dto/official-immigration-response.dto';
import { OfficialImmigrationProjectionService } from './services/official-immigration-projection.service';

@ApiTags('official-immigration-experience')
@Controller('experience/official/immigration')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialImmigrationController {
  constructor(private readonly projections: OfficialImmigrationProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Immigration-specific official workspace queues and metrics' })
  @ApiOkResponse({ type: OfficialImmigrationWorkspaceResponseDto })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }

  @Get('cases/:id/available-actions')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Immigration case actions with authority and external dependency evaluation',
  })
  @ApiOkResponse({ type: OfficialImmigrationAvailableActionsResponseDto })
  getAvailableActions(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return this.projections.getAvailableActions(context, caseId);
  }
}
