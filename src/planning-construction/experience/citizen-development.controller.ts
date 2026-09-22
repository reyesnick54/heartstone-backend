import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { PlanningConstructionScopeService } from './services/planning-construction-scope.service';

@ApiTags('citizen-planning-construction-experience')
@Controller('experience/citizen/development-projects')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenDevelopmentController {
  constructor(private readonly scope: PlanningConstructionScopeService) {}

  @Get()
  @ApiOperation({ summary: 'List citizen development projects (individual applicant scope)' })
  listProjects(@CurrentSession() session: SessionContextDto) {
    return this.scope.listCitizenProjects(session.identityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Unified development portal project view for citizen applicant' })
  getProject(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) projectId: string,
  ) {
    return this.scope.getCitizenProject(session.identityId, projectId);
  }
}

@ApiTags('citizen-planning-construction-experience')
@Controller('experience/citizen/development-actions')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenDevelopmentActionsController {
  constructor(private readonly scope: PlanningConstructionScopeService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen development action center across owned projects' })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.scope.listCitizenActions(session.identityId);
  }
}
