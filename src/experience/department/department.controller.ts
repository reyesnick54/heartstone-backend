import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { DEPARTMENT_EXPERIENCE_API_TAG } from './department-experience.constants';
import { DepartmentAlertsResponseDto } from './dto/department-alerts-response.dto';
import { DepartmentAppealsResponseDto } from './dto/department-appeals-response.dto';
import { DepartmentCasesResponseDto } from './dto/department-cases-response.dto';
import { DepartmentComplianceResponseDto } from './dto/department-compliance-response.dto';
import { DepartmentDependenciesResponseDto } from './dto/department-dependencies-response.dto';
import { DepartmentHomeResponseDto } from './dto/department-home-response.dto';
import { DepartmentMeResponseDto } from './dto/department-me-response.dto';
import { DepartmentOfficersResponseDto } from './dto/department-officers-response.dto';
import { DepartmentServicesResponseDto } from './dto/department-services-response.dto';
import { DepartmentSlaResponseDto } from './dto/department-sla-response.dto';
import { DepartmentWorkloadResponseDto } from './dto/department-workload-response.dto';
import { DepartmentAlertsService } from './services/department-alerts.service';
import { DepartmentAppealsService } from './services/department-appeals.service';
import { DepartmentCasesService } from './services/department-cases.service';
import { DepartmentComplianceService } from './services/department-compliance.service';
import { DepartmentDependenciesService } from './services/department-dependencies.service';
import { DepartmentHomeService } from './services/department-home.service';
import { DepartmentMeService } from './services/department-me.service';
import { DepartmentOfficersService } from './services/department-officers.service';
import { DepartmentServicesService } from './services/department-services.service';
import { DepartmentSlaService } from './services/department-sla.service';
import { DepartmentWorkloadService } from './services/department-workload.service';

@ApiTags(DEPARTMENT_EXPERIENCE_API_TAG)
@ApiBearerAuth()
@Controller('experience/department')
export class DepartmentController {
  constructor(
    private readonly meService: DepartmentMeService,
    private readonly homeService: DepartmentHomeService,
    private readonly workloadService: DepartmentWorkloadService,
    private readonly servicesService: DepartmentServicesService,
    private readonly casesService: DepartmentCasesService,
    private readonly officersService: DepartmentOfficersService,
    private readonly slaService: DepartmentSlaService,
    private readonly complianceService: DepartmentComplianceService,
    private readonly appealsService: DepartmentAppealsService,
    private readonly dependenciesService: DepartmentDependenciesService,
    private readonly alertsService: DepartmentAlertsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Department management identity and accessible departments',
    description:
      'Returns authenticated actor context, institutional appointments, and which departments have configured management access. Does not assert universal authority.',
  })
  @ApiOkResponse({ type: DepartmentMeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Not an institutional actor' })
  getMe(@CurrentActor() actor: ActorContext): Promise<DepartmentMeResponseDto> {
    return this.meService.buildMeResponse(actor);
  }

  @Get(':departmentId/home')
  @ApiOperation({
    summary: 'Department management home dashboard',
    description:
      'Aggregated operational overview for department leadership. Aggregate views do not create case disposition or authority.',
  })
  @ApiOkResponse({ type: DepartmentHomeResponseDto })
  getHome(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentHomeResponseDto> {
    return this.homeService.buildHome(actor, departmentId);
  }

  @Get(':departmentId/workload')
  @ApiOperation({ summary: 'Department workload breakdown' })
  @ApiOkResponse({ type: DepartmentWorkloadResponseDto })
  getWorkload(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentWorkloadResponseDto> {
    return this.workloadService.buildWorkload(actor, departmentId);
  }

  @Get(':departmentId/services')
  @ApiOperation({ summary: 'Department government services overview' })
  @ApiOkResponse({ type: DepartmentServicesResponseDto })
  getServices(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentServicesResponseDto> {
    return this.servicesService.buildServicesView(actor, departmentId);
  }

  @Get(':departmentId/cases')
  @ApiOperation({ summary: 'Department case portfolio' })
  @ApiOkResponse({ type: DepartmentCasesResponseDto })
  getCases(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentCasesResponseDto> {
    return this.casesService.buildCasesView(actor, departmentId);
  }

  @Get(':departmentId/officers')
  @ApiOperation({
    summary: 'Department officer workload overview',
    description: 'Management-level workload information without private HR fields.',
  })
  @ApiOkResponse({ type: DepartmentOfficersResponseDto })
  getOfficers(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentOfficersResponseDto> {
    return this.officersService.buildOfficersView(actor, departmentId);
  }

  @Get(':departmentId/sla')
  @ApiOperation({
    summary: 'Department SLA status',
    description:
      'Uses authoritative case SLA clocks. Does not calculate unsupported legal conclusions.',
  })
  @ApiOkResponse({ type: DepartmentSlaResponseDto })
  getSla(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentSlaResponseDto> {
    return this.slaService.buildSlaView(actor, departmentId);
  }

  @Get(':departmentId/compliance')
  @ApiOperation({ summary: 'Department compliance matters overview' })
  @ApiOkResponse({ type: DepartmentComplianceResponseDto })
  getCompliance(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentComplianceResponseDto> {
    return this.complianceService.buildComplianceView(actor, departmentId);
  }

  @Get(':departmentId/appeals')
  @ApiOperation({ summary: 'Department active appeals overview' })
  @ApiOkResponse({ type: DepartmentAppealsResponseDto })
  getAppeals(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentAppealsResponseDto> {
    return this.appealsService.buildAppealsView(actor, departmentId);
  }

  @Get(':departmentId/dependencies')
  @ApiOperation({ summary: 'Department unresolved dependencies' })
  @ApiOkResponse({ type: DepartmentDependenciesResponseDto })
  getDependencies(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentDependenciesResponseDto> {
    return this.dependenciesService.buildDependenciesView(actor, departmentId);
  }

  @Get(':departmentId/alerts')
  @ApiOperation({
    summary: 'Department operational alerts',
    description: 'Verified operational warnings only. Alerts are not enforcement findings.',
  })
  @ApiOkResponse({ type: DepartmentAlertsResponseDto })
  getAlerts(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentAlertsResponseDto> {
    return this.alertsService.buildAlertsView(actor, departmentId);
  }
}
