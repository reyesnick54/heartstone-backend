import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import {
  resolveFunctionFromDecisionTypeVersion,
  resolveResourceFromCase,
} from '../authority/consequential-action/consequential-action-resolvers';
import { ActorContextService } from '../identity/auth/context/actor-context.service';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ScopedResourceType } from '../institutional-scope/institutional-scope.types';
import { ResourceAccessService } from '../institutional-scope/resource-access.service';
import { AssessDecisionReadinessDto } from './dto/assess-decision-readiness.dto';
import { CreateDecisionPreparationDto } from './dto/create-decision-preparation.dto';
import { ExecuteGovernmentDecisionDto } from './dto/execute-government-decision.dto';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

@ApiTags('decisions')
@Controller('decisions')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
export class DecisionsController {
  constructor(
    private readonly readiness: DecisionReadinessService,
    private readonly execution: DecisionExecutionService,
    private readonly preparation: DecisionPreparationService,
    private readonly actorContext: ActorContextService,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  @Post('readiness/assess')
  @ConsequentialAction({
    action: AuthorityActionType.DECIDE,
    functionResolver: resolveFunctionFromDecisionTypeVersion,
    resourceResolver: resolveResourceFromCase,
    institutionalFieldPrefixes: ['proposedDecisionMaker'],
  })
  @ApiOperation({ summary: 'Assess whether a case is ready for authorized government decision' })
  async assessReadiness(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: AssessDecisionReadinessDto,
  ) {
    await this.resourceAccess.assertInstitutionalBoundary(
      session,
      ScopedResourceType.CASE,
      dto.caseId,
    );

    this.actorContext.assertActorIdentityMatchesSession(
      session.identityId,
      dto.proposedDecisionMakerIdentityId,
      'proposedDecisionMakerIdentityId',
    );

    return this.readiness.assess({
      caseId: dto.caseId,
      decisionTypeVersionId: dto.decisionTypeVersionId,
      proposedDecisionMakerIdentityId: session.identityId,
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
  @ConsequentialAction({
    action: AuthorityActionType.DECIDE,
    functionResolver: resolveFunctionFromDecisionTypeVersion,
    resourceResolver: resolveResourceFromCase,
    institutionalFieldPrefixes: ['decisionMaker'],
  })
  @ApiOperation({
    summary: 'Record an authorized government decision (requires explicit decision-maker intent)',
  })
  async executeDecision(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: ExecuteGovernmentDecisionDto,
  ) {
    await this.resourceAccess.assertInstitutionalBoundary(
      session,
      ScopedResourceType.CASE,
      dto.caseId,
    );

    this.actorContext.assertActorIdentityMatchesSession(
      session.identityId,
      dto.decisionMakerIdentityId,
      'decisionMakerIdentityId',
    );

    return this.execution.executeDecision({
      caseId: dto.caseId,
      decisionTypeVersionId: dto.decisionTypeVersionId,
      decisionReadinessAssessmentId: dto.decisionReadinessAssessmentId,
      evidencePacketVersionId: dto.evidencePacketVersionId,
      decisionMakerIdentityId: session.identityId,
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
