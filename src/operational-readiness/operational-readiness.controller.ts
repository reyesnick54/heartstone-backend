import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { ActivationGovernanceService } from './activation/activation-governance.service';
import { CapabilityDefinitionService } from './capabilities/capability-definition.service';
import { CapabilityMaturityService } from './capabilities/capability-maturity.service';
import { OperationalReadinessBoundaryService } from './common/operational-readiness-boundary.service';
import { CapabilityDependencyService } from './dependencies/capability-dependency.service';
import { CreateCapabilityDefinitionDto } from './dto/create-capability-definition.dto';
import { CreateCapabilityVersionDto } from './dto/create-capability-version.dto';
import { CreateMaturityAssessmentDto } from './dto/create-maturity-assessment.dto';
import { RecordMaturityDecisionDto } from './dto/record-maturity-decision.dto';
import {
  OPERATIONAL_READINESS_AUTHORITY_FUNCTION_CODES,
  PHASE_13A_BOUNDARY_DISCLAIMER,
} from './operational-readiness.constants';
import { CapabilityOwnerService } from './owners/capability-owner.service';
import { ProductionReadinessService } from './readiness/production-readiness.service';
import { CapabilityRevalidationService } from './revalidation/capability-revalidation.service';

@ApiTags('operational-readiness')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Operational readiness assessment administration",
  authorityRequirement: "Institutional readiness configuration authority",
  actorSource: "Authenticated institutional administrator",
  primarySecurityInvariant: "Readiness metadata does not confer production authority",
})
@Controller('operational-readiness')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
export class OperationalReadinessController {
  constructor(
    private readonly boundary: OperationalReadinessBoundaryService,
    private readonly definitionService: CapabilityDefinitionService,
    private readonly maturityService: CapabilityMaturityService,
    private readonly productionReadinessService: ProductionReadinessService,
    private readonly activationGovernanceService: ActivationGovernanceService,
    private readonly dependencyService: CapabilityDependencyService,
    private readonly ownerService: CapabilityOwnerService,
    private readonly revalidationService: CapabilityRevalidationService,
  ) {}

  @Get('boundary')
  getBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: PHASE_13A_BOUNDARY_DISCLAIMER };
  }

  @Post('capabilities/definitions')
  createDefinition(@Body() body: CreateCapabilityDefinitionDto) {
    this.boundary.rejectClientProtectedMaturityFields(body as unknown as Record<string, unknown>);
    return this.definitionService.createDefinition(body);
  }

  @Get('capabilities/definitions/:id')
  getDefinition(@Param('id') id: string) {
    return this.definitionService.findDefinitionById(id);
  }

  @Patch('capabilities/definitions/:id')
  updateDefinition(@Param('id') id: string, @Body() body: Partial<CreateCapabilityDefinitionDto>) {
    this.boundary.rejectClientProtectedMaturityFields(body);
    return this.definitionService.updateDefinition(id, body, body);
  }

  @Post('capabilities/versions')
  createVersion(@Body() body: CreateCapabilityVersionDto) {
    return this.definitionService.createVersion(body);
  }

  @Post('capabilities/maturity-assessments')
  createMaturityAssessment(
    @Body() body: CreateMaturityAssessmentDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    this.boundary.rejectClientProtectedMaturityFields(body as unknown as Record<string, unknown>);
    return this.maturityService.createAssessment({
      capabilityDefinitionId: body.capabilityDefinitionId,
      capabilityVersionId: body.capabilityVersionId,
      requestedMaturity: body.requestedMaturity,
      scope: body.scope,
      environment: body.environment,
      usersPopulation: body.usersPopulation,
      authorityBasis: body.authorityBasis,
      institutionalOwnerId: body.institutionalOwnerId,
      technicalOwnerIdentityId: body.technicalOwnerIdentityId,
      evidence: body.evidence,
      isTechnicalAdministrator: body.isTechnicalAdministrator,
      acceptsInstitutionalRisk: body.acceptsInstitutionalRisk,
      actorIdentityId: session.identityId,
    });
  }

  @Post('capabilities/maturity-assessments/:id/decision')
  @ConsequentialAction({
    action: AuthorityActionType.DECIDE,
    functionCode: OPERATIONAL_READINESS_AUTHORITY_FUNCTION_CODES.MATURITY_DECISION,
  })
  recordMaturityDecision(
    @Param('id') id: string,
    @Body() body: RecordMaturityDecisionDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.maturityService.recordDecision({
      assessmentId: id,
      decision: body.decision,
      reviewerIdentityId: session.identityId,
      actorRoleMarker: body.actorRoleMarker,
    });
  }

  @Get('capabilities/definitions/:id/maturity-history')
  getMaturityHistory(@Param('id') id: string) {
    return this.maturityService.getMaturityHistory(id);
  }

  @Get('capabilities/definitions/:id/operational-view')
  getOperationalView(@Param('id') id: string) {
    return this.definitionService.getOperationalView(id);
  }

  @Post('production-readiness/assessments')
  createProductionReadinessAssessment(
    @Body() body: { capabilityDefinitionId: string; capabilityVersionId: string; summary?: string },
    @CurrentSession() session: SessionContextDto,
  ) {
    this.boundary.rejectClientProtectedReadinessFields(body);
    return this.productionReadinessService.createAssessment({
      ...body,
      assessedByIdentityId: session.identityId,
    });
  }

  @Get('production-readiness/assessments/:id')
  getProductionReadinessAssessment(@Param('id') id: string) {
    return this.productionReadinessService.findAssessmentById(id);
  }

  @Get('production-readiness/assessments/:id/evidence/replay')
  getReplayableEvidence(@Param('id') id: string) {
    return this.productionReadinessService.getReplayableEvidence(id);
  }

  @Post('activation/conditions')
  createActivationCondition(
    @Body() body: Parameters<ActivationGovernanceService['createCondition']>[0],
  ) {
    return this.activationGovernanceService.createCondition(body);
  }

  @Post('activation/restrictions')
  createActivationRestriction(
    @Body() body: Parameters<ActivationGovernanceService['createRestriction']>[0],
  ) {
    return this.activationGovernanceService.createRestriction(body);
  }

  @Post('activation/safe-halt-conditions')
  createSafeHaltCondition(
    @Body() body: Parameters<ActivationGovernanceService['createSafeHaltCondition']>[0],
  ) {
    return this.activationGovernanceService.createSafeHaltCondition(body);
  }

  @Get('activation/conditions/:capabilityDefinitionId/evaluation')
  evaluateActivationConditions(@Param('capabilityDefinitionId') capabilityDefinitionId: string) {
    return this.activationGovernanceService.evaluateMandatoryConditions(capabilityDefinitionId);
  }

  @Post('dependencies')
  createDependency(@Body() body: Parameters<CapabilityDependencyService['createDependency']>[0]) {
    this.boundary.rejectClientProtectedDependencyFields(body as unknown as Record<string, unknown>);
    return this.dependencyService.createDependency(
      body,
      body as unknown as Record<string, unknown>,
    );
  }

  @Get('dependencies/:capabilityDefinitionId')
  listDependencies(@Param('capabilityDefinitionId') capabilityDefinitionId: string) {
    return this.dependencyService.listDependencies(capabilityDefinitionId);
  }

  @Post('owners/assignments')
  assignOwners(
    @Body() body: Parameters<CapabilityOwnerService['assignOwners']>[0],
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.ownerService.assignOwners({
      ...body,
      assignedByIdentityId: session.identityId,
    });
  }

  @Post('revalidation/trigger')
  triggerRevalidation(
    @Body()
    body: {
      capabilityDefinitionId: string;
      trigger: Parameters<
        CapabilityRevalidationService['recordRevalidationRequirement']
      >[0]['trigger'];
      description: string;
    },
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.revalidationService.recordRevalidationRequirement({
      ...body,
      triggeredByIdentityId: session.identityId,
    });
  }
}
