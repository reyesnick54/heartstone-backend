import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CurrentExecutiveContext } from './decorators/current-executive-context.decorator';
import {
  ExecutiveAlertsResponseDto,
  ExecutiveGovernmentOperationsDto,
  ExecutiveHomeResponseDto,
  ExecutiveSectionResponseDto,
} from './dto/executive-response.dto';
import { EXECUTIVE_EXPERIENCE_API_TAG } from './executive-experience.constants';
import { ExecutiveExperienceGuard } from './guards/executive-experience.guard';
import { ExecutiveBriefingService } from './services/executive-briefing.service';
import { type ResolvedExecutiveContext } from './types/executive-context.types';

@ApiTags(EXECUTIVE_EXPERIENCE_API_TAG)
@ApiBearerAuth()
@Controller('experience/executive')
@UseGuards(SessionAuthGuard, ExecutiveExperienceGuard)
export class ExecutiveController {
  constructor(private readonly briefingService: ExecutiveBriefingService) {}

  @Get('home')
  @ApiOperation({
    summary: 'Executive government home briefing',
    description:
      'Strategic cross-government overview for authorized leadership. Informational visibility only; does not confer command authority.',
  })
  @ApiOkResponse({ type: ExecutiveHomeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Executive briefing access denied' })
  getHome(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildHome(context);
  }

  @Get('government-operations')
  @ApiOperation({
    summary: 'Government operations executive view',
    description: 'Case, service, and workload metrics derived from operational projections.',
  })
  @ApiOkResponse({ type: ExecutiveGovernmentOperationsDto })
  getGovernmentOperations(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildGovernmentOperations(context);
  }

  @Get('services')
  @ApiOperation({ summary: 'Government services executive view' })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getServices(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildServices(context);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Department workload executive view' })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getDepartments(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildDepartments(context);
  }

  @Get('investment')
  @ApiOperation({
    summary: 'Economy and investment executive view',
    description:
      'Strategic project and capital projections. Reported milestones are separately identified from verified milestones.',
  })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getInvestment(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildInvestment(context);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Strategic projects executive view' })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getProjects(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildProjects(context);
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Compliance oversight executive view' })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getCompliance(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildCompliance(context);
  }

  @Get('redress')
  @ApiOperation({ summary: 'Appeals and redress backlog executive view' })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getRedress(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildRedress(context);
  }

  @Get('digital-government')
  @ApiOperation({
    summary: 'Digital government executive view',
    description: 'Service health, integration, security, and production readiness signals.',
  })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getDigitalGovernment(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildDigitalGovernment(context);
  }

  @Get('risk')
  @ApiOperation({
    summary: 'Operational and institutional risk executive view',
    description:
      'Risk scores are advisory projections and are not sanctions or enforcement decisions.',
  })
  @ApiOkResponse({ type: ExecutiveSectionResponseDto })
  getRisk(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildRisk(context);
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Executive intelligence alerts',
    description:
      'AI and monitoring alerts require verification before treating as confirmed violations.',
  })
  @ApiOkResponse({ type: ExecutiveAlertsResponseDto })
  getAlerts(@CurrentExecutiveContext() context: ResolvedExecutiveContext) {
    return this.briefingService.buildAlerts(context);
  }
}
