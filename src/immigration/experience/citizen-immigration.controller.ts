import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import {
  CitizenImmigrationActionsResponseDto,
  CitizenImmigrationApplicationsResponseDto,
  CitizenImmigrationCredentialsResponseDto,
  CitizenImmigrationOverviewResponseDto,
  CitizenImmigrationStatusResponseDto,
} from './dto/citizen-immigration-response.dto';
import { CitizenImmigrationProjectionService } from './services/citizen-immigration-projection.service';

@ApiTags('citizen-immigration-experience')
@Controller('experience/citizen/immigration')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenImmigrationController {
  constructor(private readonly projections: CitizenImmigrationProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Immigration vertical overview for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenImmigrationOverviewResponseDto })
  getOverview(@CurrentSession() session: SessionContextDto) {
    return this.projections.getOverview(session.identityId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Applicant-safe immigration status and activity summary' })
  @ApiOkResponse({ type: CitizenImmigrationStatusResponseDto })
  getStatus(@CurrentSession() session: SessionContextDto) {
    return this.projections.getStatus(session.identityId);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List immigration applications within citizen or representative scope' })
  @ApiOkResponse({ type: CitizenImmigrationApplicationsResponseDto })
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('credentials')
  @ApiOperation({ summary: 'List issued immigration credentials linked to governed decisions' })
  @ApiOkResponse({ type: CitizenImmigrationCredentialsResponseDto })
  listCredentials(@CurrentSession() session: SessionContextDto) {
    return this.projections.listCredentials(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List safe immigration actions available to the applicant' })
  @ApiOkResponse({ type: CitizenImmigrationActionsResponseDto })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
