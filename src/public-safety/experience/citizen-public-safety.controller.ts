import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CitizenPublicSafetyProjectionService } from './services/citizen-public-safety-projection.service';

@ApiTags('citizen-public-safety-experience')
@Controller('experience/citizen/public-safety')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenPublicSafetyController {
  constructor(private readonly projections: CitizenPublicSafetyProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen public safety home (informational projections)' })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.buildHome(session.identityId);
  }

  @Get('reports')
  listReports(@CurrentSession() session: SessionContextDto) {
    return this.projections.listReports(session.identityId);
  }

  @Get('emergency-events')
  listEmergencyEvents() {
    return this.projections.listEmergencyEvents();
  }

  @Get('assistance')
  listAssistance(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAssistance(session.identityId);
  }

  @Get('actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
