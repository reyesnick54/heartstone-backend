import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  CitizenEducationActionsResponseDto,
  CitizenEducationApplicationsResponseDto,
  CitizenEducationCredentialItemDto,
  CitizenEducationEnrollmentItemDto,
  CitizenEducationHomeResponseDto,
  CitizenEducationSupportResponseDto,
} from './dto/citizen-education-response.dto';
import { CitizenEducationProjectionService } from './services/citizen-education-projection.service';

@ApiTags('citizen-education-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('experience/citizen/education')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenEducationController {
  constructor(private readonly projections: CitizenEducationProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen/student education home (includes authorized guardian scope)' })
  @ApiOkResponse({ type: CitizenEducationHomeResponseDto })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'List enrollments for the student profiles the citizen may access' })
  @ApiOkResponse({ type: CitizenEducationEnrollmentItemDto, isArray: true })
  listEnrollments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listEnrollments(session.identityId);
  }

  @Get('credentials')
  @ApiOperation({
    summary: 'List academic credentials for the student profiles the citizen may access',
  })
  @ApiOkResponse({ type: CitizenEducationCredentialItemDto, isArray: true })
  listCredentials(@CurrentSession() session: SessionContextDto) {
    return this.projections.listCredentials(session.identityId);
  }

  @Get('applications')
  @ApiOperation({ summary: "List enrollment and scholarship applications in the citizen's scope" })
  @ApiOkResponse({ type: CitizenEducationApplicationsResponseDto })
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('support')
  @ApiOperation({
    summary: "List scholarship and grant support applications in the citizen's scope",
  })
  @ApiOkResponse({ type: CitizenEducationSupportResponseDto })
  listSupport(@CurrentSession() session: SessionContextDto) {
    return this.projections.listSupport(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List self-service education actions available to the citizen' })
  @ApiOkResponse({ type: CitizenEducationActionsResponseDto })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
