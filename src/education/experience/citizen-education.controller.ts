import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CitizenEducationProjectionService } from './services/citizen-education-projection.service';

@ApiTags('citizen-education-experience')
@Controller('experience/citizen/education')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenEducationController {
  constructor(private readonly projections: CitizenEducationProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen/student education home (includes authorized guardian scope)' })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('enrollments')
  listEnrollments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listEnrollments(session.identityId);
  }

  @Get('credentials')
  listCredentials(@CurrentSession() session: SessionContextDto) {
    return this.projections.listCredentials(session.identityId);
  }

  @Get('applications')
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('support')
  listSupport(@CurrentSession() session: SessionContextDto) {
    return this.projections.listSupport(session.identityId);
  }

  @Get('actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
