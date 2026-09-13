import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';

import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { CaseCommunicationService } from './case-communication.service';
import { CaseDashboardReadService } from './case-dashboard-read.service';
import { CaseEventService } from './case-event.service';
import { CaseMilestoneService } from './case-milestone.service';
import { CasePublicStatusProjectionService } from './case-public-status-projection.service';
import { CreateCaseCommunicationDto } from './dto/create-case-communication.dto';
import { CreateCaseMilestoneDto } from './dto/create-case-milestone.dto';

interface SessionRequest extends Request {
  session?: SessionContextDto;
}

@ApiTags('cases')
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
  ) {}

  @Get(':caseId/timeline')
  @ApiOperation({ summary: 'Official case event timeline' })
  @ApiOkResponse({ description: 'Append-only operational event history' })
  getOfficialTimeline(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.caseEventService.listOfficialTimeline(caseId);
  }

  @Get(':caseId/timeline/applicant')
  @ApiOperation({ summary: 'Applicant-visible case timeline' })
  @ApiOkResponse({ description: 'Public-safe event history excluding internal notes' })
  getApplicantTimeline(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.caseEventService.listApplicantVisibleTimeline(caseId);
  }

  @Get(':caseId/communications')
  @ApiOperation({ summary: 'Official case communications' })
  getOfficialCommunications(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.communicationService.listOfficialCommunications(caseId);
  }

  @Get(':caseId/communications/applicant')
  @ApiOperation({ summary: 'Applicant-visible communications' })
  getApplicantCommunications(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.communicationService.listApplicantVisibleCommunications(caseId);
  }

  @Post(':caseId/communications')
  @ApiOperation({ summary: 'Record a case communication' })
  @ApiCreatedResponse({ description: 'Communication recorded with optional outbox enqueue' })
  createCommunication(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateCaseCommunicationDto,
  ) {
    return this.communicationService.create({
      caseId,
      communicationType: dto.communicationType,
      senderIdentityId: dto.senderIdentityId,
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
  getMilestones(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.milestoneService.listForCase(caseId);
  }

  @Post(':caseId/milestones')
  @ApiOperation({ summary: 'Create a case milestone' })
  @ApiCreatedResponse({ description: 'Milestone created' })
  createMilestone(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateCaseMilestoneDto,
  ) {
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
  getPublicStatus(@Param('caseId', ParseUUIDPipe) caseId: string) {
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
  getDashboard(@Param('caseId', ParseUUIDPipe) caseId: string, @Req() req: SessionRequest) {
    const session = req.session;
    if (!session) {
      throw new ForbiddenException('Authentication required');
    }

    return this.dashboardService.buildDashboard(caseId, session.identityId);
  }
}
