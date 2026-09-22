import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { ProviderHealthcareProjectionService } from './services/provider-healthcare-projection.service';

@ApiTags('provider-healthcare-experience')
@Controller('experience/provider/healthcare')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ProviderHealthcareController {
  constructor(private readonly projections: ProviderHealthcareProjectionService) {}

  @Get('workspace')
  @ApiOperation({
    summary: 'Provider healthcare workspace governed by HealthcareDataAccessPolicy',
  })
  @ApiOkResponse({ description: 'Provider-safe patient treatment projections' })
  getWorkspace(@CurrentSession() session: SessionContextDto) {
    return this.projections.getWorkspace(session.identityId);
  }
}
