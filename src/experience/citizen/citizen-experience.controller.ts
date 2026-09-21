import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CitizenActionsResponseDto } from './dto/citizen-action.dto';
import {
  CitizenApplicationDetailDto,
  CitizenApplicationsResponseDto,
} from './dto/citizen-application.dto';
import { CitizenCaseStatusResponseDto } from './dto/citizen-case-status-response.dto';
import { CitizenHomeResponseDto } from './dto/citizen-home-response.dto';
import { CitizenMeResponseDto } from './dto/citizen-me-response.dto';
import { CitizenActionCenterService } from './services/citizen-action-center.service';
import { CitizenApplicationsService } from './services/citizen-applications.service';
import { CitizenCaseStatusService } from './services/citizen-case-status.service';
import { CitizenHomeService } from './services/citizen-home.service';
import { CitizenMeService } from './services/citizen-me.service';

@ApiTags('citizen-experience')
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenExperienceController {
  constructor(
    private readonly meService: CitizenMeService,
    private readonly homeService: CitizenHomeService,
    private readonly actionCenterService: CitizenActionCenterService,
    private readonly applicationsService: CitizenApplicationsService,
    private readonly caseStatusService: CitizenCaseStatusService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get aggregated citizen profile summary derived from authenticated session',
  })
  @ApiOkResponse({ type: CitizenMeResponseDto })
  getMe(@CurrentSession() session: SessionContextDto): Promise<CitizenMeResponseDto> {
    return this.meService.getMe(session);
  }

  @Get('home')
  @ApiOperation({ summary: 'Get frontend-ready citizen home dashboard summary counts' })
  @ApiOkResponse({ type: CitizenHomeResponseDto })
  getHome(@CurrentSession() session: SessionContextDto): Promise<CitizenHomeResponseDto> {
    return this.homeService.getHome(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List actionable citizen tasks derived from existing platform state' })
  @ApiOkResponse({ type: CitizenActionsResponseDto })
  getActions(
    @CurrentSession() session: SessionContextDto,
    @Query() query: PaginationQueryDto,
  ): Promise<CitizenActionsResponseDto> {
    return this.actionCenterService.listActions(session.identityId, query);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List applications accessible to the authenticated citizen' })
  @ApiOkResponse({ type: CitizenApplicationsResponseDto })
  listApplications(
    @CurrentSession() session: SessionContextDto,
    @Query() query: PaginationQueryDto,
  ): Promise<CitizenApplicationsResponseDto> {
    return this.applicationsService.listApplications(session.identityId, query);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a single application detail for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenApplicationDetailDto })
  getApplication(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CitizenApplicationDetailDto> {
    return this.applicationsService.getApplication(session.identityId, id);
  }

  @Get('cases/:id/status')
  @ApiOperation({ summary: 'Get applicant-safe case status for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenCaseStatusResponseDto })
  getCaseStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CitizenCaseStatusResponseDto> {
    return this.caseStatusService.getCaseStatus(session.identityId, id);
  }
}
