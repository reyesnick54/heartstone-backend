import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CorporateRegistryOfficialWorkspaceService } from '../../corporate-registry/workspace/corporate-registry-official-workspace.service';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { OfficialCorporateRegistryWorkspaceResponseDto } from './dto/official-corporate-registry-workspace-response.dto';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from './guards/official-experience.guard';
import { OFFICIAL_EXPERIENCE_API_TAG } from './official-experience.constants';

@ApiTags(OFFICIAL_EXPERIENCE_API_TAG)
@ApiBearerAuth()
@Controller('experience/official/corporate-registry')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
export class OfficialCorporateRegistryController {
  constructor(
    private readonly registryWorkspaceService: CorporateRegistryOfficialWorkspaceService,
  ) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Registry officer workspace queues for corporate lifecycle processing',
  })
  @ApiOkResponse({ type: OfficialCorporateRegistryWorkspaceResponseDto })
  getWorkspace(): Promise<OfficialCorporateRegistryWorkspaceResponseDto> {
    return this.registryWorkspaceService.buildRegistryOfficerWorkspace();
  }
}
