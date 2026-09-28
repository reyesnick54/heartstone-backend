import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { IntelligenceSuspendedAiGuard } from '../common/intelligence-suspended-ai.guard';
import { ExecuteGovernedAiCallDto } from './dto/execute-governed-ai-call.dto';
import { RecordAiOutputEditDto } from './dto/record-ai-output-edit.dto';
import { RecordAiReviewDto } from './dto/record-ai-review.dto';
import { AiCallRuntimeService } from './services/ai-call-runtime.service';
import { AiConsequentialDefenseService } from './services/ai-consequential-defense.service';
import { GovernedAiProductionGateService } from './services/governed-ai-production-gate.service';

@ApiTags('intelligence-governed-ai')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, IntelligenceSuspendedAiGuard)
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Institutional AI governance and recommendatory assistance',
  authorityRequirement: 'Governed AI policy gate; outputs are not government decisions',
  actorSource: 'Authenticated human institutional actor',
  primarySecurityInvariant:
    'No AI output reaches users without registry, policy, audit, and required human oversight',
})
@Controller('intelligence/governed-ai')
export class GovernedAiController {
  constructor(
    private readonly runtime: AiCallRuntimeService,
    private readonly consequentialDefense: AiConsequentialDefenseService,
    private readonly productionGate: GovernedAiProductionGateService,
  ) {}

  @Get('readiness')
  @ApiOperation({ summary: 'Governed AI operational readiness (provider activation separate)' })
  getReadiness() {
    const gate = this.productionGate.evaluateExternalAdapter();
    return {
      architectureImplemented: true,
      providerApproved: gate.externalProviderEnabled && gate.allowed,
      externalProviderEnabled: gate.externalProviderEnabled,
      reasons: gate.reasons,
    };
  }

  @Post('calls')
  @ApiOperation({ summary: 'Execute a governed AI call (recommendatory only)' })
  executeCall(@CurrentActor() actor: ActorContext, @Body() body: ExecuteGovernedAiCallDto) {
    return this.runtime.execute({
      agentDefinitionId: body.agentDefinitionId,
      institutionId: body.institutionId,
      initiatorIdentityId: actor.identityId,
      purpose: body.purpose,
      instructions: body.instructions,
      dataClassification: body.dataClassification,
      modelVersionId: body.modelVersionId,
      requestedToolCode: body.requestedToolCode,
      sourceReferences: body.sourceReferences,
      correlationId: body.correlationId,
    });
  }

  @Post('calls/:callRecordId/user-output')
  @ApiOperation({ summary: 'Retrieve user-facing AI output after governance chain is satisfied' })
  getUserOutput(@Param('callRecordId', ParseUUIDPipe) callRecordId: string) {
    return this.runtime.getUserFacingOutput(callRecordId);
  }

  @Post('output-edits')
  @ApiOperation({ summary: 'Record human edit of AI output (preserves original)' })
  recordEdit(@CurrentActor() actor: ActorContext, @Body() body: RecordAiOutputEditDto) {
    return this.runtime.recordHumanEdit({
      callRecordId: body.callRecordId,
      editorIdentityId: actor.identityId,
      editedOutput: body.editedOutput,
      editReason: body.editReason,
    });
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Record human review outcome for AI-assisted work' })
  recordReview(@CurrentActor() actor: ActorContext, @Body() body: RecordAiReviewDto) {
    return this.runtime.recordHumanReview({
      callRecordId: body.callRecordId,
      reviewerIdentityId: actor.identityId,
      reviewOutcome: body.reviewOutcome,
      governmentRecordReference: body.governmentRecordReference,
    });
  }

  @Post('defense/check-action')
  @ApiOperation({ summary: 'Assert AI cannot perform a consequential government action' })
  checkForbiddenAction(@Body('action') action: string) {
    this.consequentialDefense.assertAiCannotPerformGovernmentAction(action);
    return { allowed: false, checked: action };
  }
}
