import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../../security/route-class.enum';
import { ActorContextService } from '../../../security/services/actor-context.service';
import { CaseAccessService } from '../../../security/services/case-access.service';
import { CaseCommunicationService } from './case-communication.service';
import { CaseDashboardReadService } from './case-dashboard-read.service';
import { CaseEventService } from './case-event.service';
import { CaseMilestoneService } from './case-milestone.service';
import { CasePublicStatusProjectionService } from './case-public-status-projection.service';
import { CreateCaseCommunicationDto } from './dto/create-case-communication.dto';
import { CreateCaseMilestoneDto } from './dto/create-case-milestone.dto';

@ApiTags('cases')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: "Applicant-owned case/application scope or official institutional case scope",
  authorityRequirement: "Case access guard; official routes require institutional actor context",
  actorSource: "Session identity with applicant or official case access resolution",
  primarySecurityInvariant: "Access to a case does not confer decision authority",
})
@Controller('cases')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CaseTimelineController {
  constructor(
    private readonly caseEventService: CaseEventService,
    private readonly communicationService: CaseCommunicationService,
    private readonly milestoneService: CaseMilestoneService,
    private readonly projectionService: CasePublicStatusProjectionService,
    private readonly dashboardService: CaseDashboardReadService,
    private readonly actorContext: ActorContextService,
    private readonly caseAccess: CaseAccessService,
  ) {}

  @Get(':caseId/timeline')
  @ApiOperation({ summary: 'Official case event timeline' })
  @ApiOkResponse({ description: 'Append-only operational event history' })
  async getOfficialTimeline(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.caseAccess.assertOfficialInstitutionalAccess(caseId, actor);
    return this.caseEventService.listOfficialTimeline(caseId);
  }

  @Get(':caseId/timeline/applicant')
  @ApiOperation({ summary: 'Applicant-visible case timeline' })
  @ApiOkResponse({ description: 'Public-safe event history excluding internal notes' })
  async getApplicantTimeline(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    await this.caseAccess.assertApplicantAccess(caseId, session.identityId);
    return this.caseEventService.listApplicantVisibleTimeline(caseId);
  }

  @Get(':caseId/communications')
  @ApiOperation({ summary: 'Official case communications' })
  async getOfficialCommunications(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.caseAccess.assertOfficialInstitutionalAccess(caseId, actor);
    return this.communicationService.listOfficialCommunications(caseId);
  }

  @Get(':caseId/communications/applicant')
  @ApiOperation({ summary: 'Applicant-visible communications' })
  async getApplicantCommunications(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    await this.caseAccess.assertApplicantAccess(caseId, session.identityId);
    return this.communicationService.listApplicantVisibleCommunications(caseId);
  }

  @Post(':caseId/communications')
  @ApiOperation({ summary: 'Record a case communication' })
  @ApiCreatedResponse({ description: 'Communication recorded with optional outbox enqueue' })
  async createCommunication(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateCaseCommunicationDto,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.caseAccess.assertApplicantOrOfficialAccess(caseId, actor);
    this.actorContext.assertActorIdentityMatchesSession(
      session.identityId,
      dto.senderIdentityId,
      'senderIdentityId',
    );

    return this.communicationService.create({
      caseId,
      communicationType: dto.communicationType,
      senderIdentityId: session.identityId,
      senderOfficeholderId: dto.senderOfficeholderId,
      recipientType: dto.recipientType,
      recipientReference: dto.recipientReference,
      channel: dto.channel,
      subject: dto.subject,
      body: dto.body,
      templateReference: dto.templateReference,
      templateVersion: dto.templateVersion,
      classification: dto.classification,
      publicVisibility: dto.publicVisibility,
    });
  }

  @Get(':caseId/milestones')
  @ApiOperation({ summary: 'Case milestones' })
  async getMilestones(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.caseAccess.assertOfficialInstitutionalAccess(caseId, actor);
    return this.milestoneService.listForCase(caseId);
  }

  @Post(':caseId/milestones')
  @ApiOperation({ summary: 'Create a case milestone' })
  @ApiCreatedResponse({ description: 'Milestone created' })
  async createMilestone(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateCaseMilestoneDto,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.caseAccess.assertOfficialInstitutionalAccess(caseId, actor);
    return this.milestoneService.create({
      caseId,
      name: dto.name,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      status: dto.status,
      responsiblePartyRef: dto.responsiblePartyRef,
      sourceSlaReference: dto.sourceSlaReference,
      dependencyReference: dto.dependencyReference,
    });
  }

  @Get(':caseId/public-status')
  @ApiOperation({ summary: 'Applicant public status projection (read-only derived)' })
  async getPublicStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    await this.caseAccess.assertApplicantAccess(caseId, session.identityId);
    return this.projectionService.getApplicantProjection(caseId);
  }

  @Post(':caseId/public-status')
  @ApiOperation({ summary: 'Client override rejected' })
  rejectPublicStatusOverride() {
    throw new ForbiddenException(
      'Public status projection is derived from authoritative case state and cannot be set by clients',
    );
  }

  @Get(':caseId/dashboard')
  @ApiOperation({ summary: 'Official case dashboard read model' })
  getDashboard(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    return this.dashboardService.buildDashboard(caseId, session.identityId);
  }
}
