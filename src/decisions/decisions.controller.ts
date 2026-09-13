import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GovernmentDecisionOutcome } from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { DecisionAssistanceService } from './decision-assistance.service';
import { AddDecisionConditionDto } from './dto/add-decision-condition.dto';
import { AddDecisionFindingDto } from './dto/add-decision-finding.dto';
import { AddDecisionReasonDto } from './dto/add-decision-reason.dto';
import { AssessDecisionReadinessDto } from './dto/assess-decision-readiness.dto';
import { CreateDecisionPreparationDto } from './dto/create-decision-preparation.dto';
import { CreateGovernmentDecisionDto } from './dto/create-government-decision.dto';
import { ExecuteGovernmentDecisionDto } from './dto/execute-government-decision.dto';
import { PrepareDecisionNoticeDto } from './dto/prepare-decision-notice.dto';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { GovernmentDecisionsService } from './government-decisions.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

@ApiTags('government-decisions')
@Controller('government-decisions')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class GovernmentDecisionsController {
  constructor(
    private readonly decisionsService: GovernmentDecisionsService,
    private readonly assistanceService: DecisionAssistanceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft government decision for a case at decision pending' })
  @ApiCreatedResponse()
  create(@CurrentSession() session: SessionContextDto, @Body() dto: CreateGovernmentDecisionDto) {
    return this.decisionsService.createDecision(session.identityId, dto);
  }

  @Get(':decisionId')
  @ApiOperation({
    summary: 'Retrieve government decision detail with findings, reasons, conditions, and notices',
  })
  @ApiOkResponse()
  get(@Param('decisionId', ParseUUIDPipe) decisionId: string) {
    return this.decisionsService.getDecision(decisionId);
  }

  @Post(':decisionId/findings')
  @ApiOperation({ summary: 'Record a decision finding' })
  addFinding(
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Body() dto: AddDecisionFindingDto,
  ) {
    return this.decisionsService.addFinding(decisionId, dto);
  }

  @Get(':decisionId/findings')
  @ApiOperation({ summary: 'List decision findings' })
  listFindings(@Param('decisionId', ParseUUIDPipe) decisionId: string) {
    return this.decisionsService.listFindings(decisionId);
  }

  @Post(':decisionId/reasons')
  @ApiOperation({
    summary: 'Record an institutional decision reason attributable to the decision-maker',
  })
  addReason(
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Body() dto: AddDecisionReasonDto,
  ) {
    return this.decisionsService.addReason(decisionId, dto);
  }

  @Get(':decisionId/reasons')
  @ApiOperation({ summary: 'List decision reasons' })
  listReasons(@Param('decisionId', ParseUUIDPipe) decisionId: string) {
    return this.decisionsService.listReasons(decisionId);
  }

  @Post(':decisionId/conditions')
  @ApiOperation({ summary: 'Attach a decision condition' })
  addCondition(
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Body() dto: AddDecisionConditionDto,
  ) {
    return this.decisionsService.addCondition(decisionId, dto);
  }

  @Get(':decisionId/conditions')
  @ApiOperation({ summary: 'List decision conditions' })
  listConditions(@Param('decisionId', ParseUUIDPipe) decisionId: string) {
    return this.decisionsService.listConditions(decisionId);
  }

  @Post(':decisionId/conditions/:conditionId/approve')
  @ApiOperation({ summary: 'Approve and lock condition text' })
  approveCondition(
    @CurrentSession() session: SessionContextDto,
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
    @Body('officeholderId', ParseUUIDPipe) officeholderId: string,
  ) {
    return this.decisionsService.approveCondition(
      decisionId,
      conditionId,
      session.identityId,
      officeholderId,
    );
  }

  @Post(':decisionId/notice/prepare')
  @ApiOperation({ summary: 'Prepare decision notice with configured review rights' })
  prepareNotice(
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Body() dto: PrepareDecisionNoticeDto,
  ) {
    return this.decisionsService.prepareNotice(decisionId, dto);
  }

  @Post(':decisionId/notice/:noticeId/finalize')
  @ApiOperation({ summary: 'Finalize prepared decision notice without issuing an instrument' })
  finalizeNotice(
    @CurrentSession() session: SessionContextDto,
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Param('noticeId', ParseUUIDPipe) noticeId: string,
    @Body('officeholderId', ParseUUIDPipe) officeholderId: string,
  ) {
    return this.decisionsService.finalizeNotice(
      decisionId,
      noticeId,
      session.identityId,
      officeholderId,
    );
  }

  @Post(':decisionId/finalize')
  @ApiOperation({
    summary: 'Finalize government decision when configured requirements are satisfied',
  })
  finalizeDecision(
    @CurrentSession() session: SessionContextDto,
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @Body('officeholderId', ParseUUIDPipe) officeholderId: string,
    @Body('outcome') outcome: GovernmentDecisionOutcome,
  ) {
    return this.decisionsService.finalizeDecision(
      decisionId,
      session.identityId,
      officeholderId,
      outcome,
    );
  }

  @Post(':decisionId/issuance-readiness')
  @ApiOperation({ summary: 'Check whether unsatisfied precedent conditions block later issuance' })
  issuanceReadiness(@Param('decisionId', ParseUUIDPipe) decisionId: string) {
    return this.decisionsService.assertIssuanceAllowed(decisionId);
  }
}

@ApiTags('decisions')
@Controller('api/v1/decisions')
@UseGuards(SessionAuthGuard)
export class DecisionsController {
  constructor(
    private readonly readiness: DecisionReadinessService,
    private readonly execution: DecisionExecutionService,
    private readonly preparation: DecisionPreparationService,
  ) {}

  @Post('readiness/assess')
  @ApiOperation({ summary: 'Assess whether a case is ready for authorized government decision' })
  assessReadiness(@Body() dto: AssessDecisionReadinessDto) {
    return this.readiness.assess({
      caseId: dto.caseId,
      decisionTypeVersionId: dto.decisionTypeVersionId,
      proposedDecisionMakerIdentityId: dto.proposedDecisionMakerIdentityId,
      proposedDecisionMakerOfficeholderId: dto.proposedDecisionMakerOfficeholderId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      requestedOutcome: dto.requestedOutcome,
      evidencePacketVersionId: dto.evidencePacketVersionId,
      at: dto.at ? new Date(dto.at) : undefined,
      isConflicted: dto.isConflicted,
      isRecused: dto.isRecused,
      hasSecondApproval: dto.hasSecondApproval,
    });
  }

  @Post('execute')
  @ApiOperation({
    summary: 'Record an authorized government decision (requires explicit decision-maker intent)',
  })
  executeDecision(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: ExecuteGovernmentDecisionDto,
  ) {
    return this.execution.executeDecision({
      caseId: dto.caseId,
      decisionTypeVersionId: dto.decisionTypeVersionId,
      decisionReadinessAssessmentId: dto.decisionReadinessAssessmentId,
      evidencePacketVersionId: dto.evidencePacketVersionId,
      decisionMakerIdentityId: dto.decisionMakerIdentityId || session.identityId,
      decisionMakerOfficeholderId: dto.decisionMakerOfficeholderId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      matterDecided: dto.matterDecided,
      outcome: dto.outcome,
      explicitIntentConfirmed: dto.explicitIntentConfirmed,
      at: dto.at ? new Date(dto.at) : undefined,
      isConflicted: dto.isConflicted,
      isRecused: dto.isRecused,
      hasSecondApproval: dto.hasSecondApproval,
    });
  }

  @Post('preparation')
  @ApiOperation({
    summary:
      'Create a non-final decision preparation record (drafting only, not an official decision)',
  })
  createPreparation(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateDecisionPreparationDto,
  ) {
    return this.preparation.create({
      caseId: dto.caseId,
      decisionTypeVersionId: dto.decisionTypeVersionId,
      proposedFindings: dto.proposedFindings,
      proposedReasons: dto.proposedReasons,
      proposedOutcome: dto.proposedOutcome,
      recommendation: dto.recommendation,
      aiAssistanceMetadata: dto.aiAssistanceMetadata,
      editorIdentityId: session.identityId,
    });
  }
}
