import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { AssessDecisionReadinessDto } from './dto/assess-decision-readiness.dto';
import { CreateDecisionPreparationDto } from './dto/create-decision-preparation.dto';
import { ExecuteGovernmentDecisionDto } from './dto/execute-government-decision.dto';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

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
