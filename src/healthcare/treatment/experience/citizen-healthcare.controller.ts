import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { CitizenHealthcareProjectionService } from './services/citizen-healthcare-projection.service';

@ApiTags('citizen-healthcare-experience')
@Controller('experience/citizen/healthcare')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenHealthcareController {
  constructor(private readonly projections: CitizenHealthcareProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen healthcare home — authorized treatment journey summary' })
  @ApiOkResponse({ description: 'Patient-safe healthcare overview' })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Citizen healthcare profile projection' })
  getProfile(@CurrentSession() session: SessionContextDto) {
    return this.projections.getProfile(session.identityId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Providers linked to enrolled or active treatment programs' })
  listProviders(@CurrentSession() session: SessionContextDto) {
    return this.projections.listProviders(session.identityId);
  }

  @Get('programs')
  @ApiOperation({ summary: 'Discover published treatment programs (not medical recommendations)' })
  listPrograms(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPrograms(session.identityId);
  }

  @Get('treatments')
  @ApiOperation({ summary: 'Screenings and enrolled treatments for the authenticated patient' })
  listTreatments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listTreatments(session.identityId);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Treatment referrals for the authenticated patient' })
  listReferrals(@CurrentSession() session: SessionContextDto) {
    return this.projections.listReferrals(session.identityId);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Upcoming healthcare appointments linked to treatment enrollments' })
  listAppointments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAppointments(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Required patient actions and consent state' })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
