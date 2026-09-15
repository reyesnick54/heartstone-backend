import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ChangeAssessmentOutcome,
  EnvironmentIntegrationMode,
  PlatformEnvironmentClassification,
} from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ChangeManagementService } from './changes/change-management.service';
import { CiGovernanceService } from './ci/ci-governance.service';
import { ConfigurationGovernanceService } from './configuration/configuration-governance.service';
import { EnvironmentRegistryService } from './environments/environment-registry.service';
import { EnvironmentSeparationService } from './environments/environment-separation.service';
import { FeatureActivationService } from './features/feature-activation.service';
import {
  PHASE_13_BOUNDARY_DISCLAIMERS,
  PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
} from './production-readiness.constants';
import { DeploymentService } from './releases/deployment.service';
import { ReleaseGovernanceService } from './releases/release-governance.service';

@ApiTags('production-readiness')
@Controller('production-readiness')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ProductionReadinessController {
  constructor(
    private readonly environmentRegistry: EnvironmentRegistryService,
    private readonly environmentSeparation: EnvironmentSeparationService,
    private readonly releaseGovernance: ReleaseGovernanceService,
    private readonly deployment: DeploymentService,
    private readonly changeManagement: ChangeManagementService,
    private readonly configurationGovernance: ConfigurationGovernanceService,
    private readonly featureActivation: FeatureActivationService,
    private readonly ciGovernance: CiGovernanceService,
  ) {}

  @Get('boundary')
  @ApiOperation({ summary: 'Production readiness boundary disclaimer' })
  getBoundaryDisclaimer(): {
    disclaimer: string;
    invariants: typeof PHASE_13_BOUNDARY_DISCLAIMERS;
  } {
    return {
      disclaimer: PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
      invariants: PHASE_13_BOUNDARY_DISCLAIMERS,
    };
  }

  @Post('environments')
  registerEnvironment(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      classification: PlatformEnvironmentClassification;
      credentialsNamespace: string;
      secretsNamespace: string;
      dataPartitionKey: string;
      integrationEndpointPrefix: string;
      integrationMode?: EnvironmentIntegrationMode;
    },
  ) {
    return this.environmentRegistry.registerEnvironment(body);
  }

  @Post('releases')
  createRelease(
    @Body()
    body: {
      version: string;
      sourceCommitSha: string;
      buildIdentifier: string;
      releaseNotes?: string;
    },
  ) {
    return this.releaseGovernance.createReleaseDefinition(body);
  }

  @Post('releases/:releaseId/artifacts')
  registerArtifact(
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
    @Body() body: { artifactDigest: string; sbomDigest: string; provenanceRef?: string },
  ) {
    return this.releaseGovernance.registerArtifact({
      releaseDefinitionId: releaseId,
      ...body,
    });
  }

  @Post('artifacts/:artifactId/accept')
  acceptArtifact(@Param('artifactId', ParseUUIDPipe) artifactId: string) {
    return this.releaseGovernance.acceptArtifact(artifactId);
  }

  @Post('artifacts/:artifactId/approve')
  approveRelease(
    @Param('artifactId', ParseUUIDPipe) artifactId: string,
    @CurrentSession() session: SessionContextDto,
    @Body() body: { notes?: string },
  ) {
    return this.releaseGovernance.approveRelease({
      releaseArtifactId: artifactId,
      approverIdentityId: session.identityId,
      notes: body.notes,
    });
  }

  @Post('deployments')
  deploy(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      environmentDefinitionId: string;
      releaseArtifactId: string;
      artifactDigest: string;
      changeRequestId?: string;
      ciPipelineRunId?: string;
    },
  ) {
    return this.deployment.deployRelease({
      ...body,
      deployedByIdentityId: session.identityId,
    });
  }

  @Post('change-requests')
  createChangeRequest(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      changeNumber: string;
      scope: string;
      reason: string;
      authorityImpact?: Record<string, unknown>;
    },
  ) {
    return this.changeManagement.createChangeRequest({
      ...body,
      requesterIdentityId: session.identityId,
    });
  }

  @Post('change-requests/:changeRequestId/approve')
  approveChangeRequest(@Param('changeRequestId', ParseUUIDPipe) changeRequestId: string) {
    return this.changeManagement.approveChangeRequest(changeRequestId);
  }

  @Post('change-requests/:changeRequestId/assess')
  assessChange(
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      outcome: ChangeAssessmentOutcome;
      findings?: Record<string, unknown>;
      requiresRevalidation?: boolean;
    },
  ) {
    return this.changeManagement.assessChange({
      changeRequestId,
      assessorIdentityId: session.identityId,
      ...body,
    });
  }

  @Post('data-transfers/approve/:approvalId')
  approveDataTransfer(
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.environmentSeparation.approveDataTransfer(approvalId, session.identityId);
  }

  @Post('features/:featureKey/activate')
  activateFeature(
    @Param('featureKey') featureKey: string,
    @CurrentSession() session: SessionContextDto,
    @Body() body: { environmentDefinitionId: string },
  ) {
    return this.featureActivation.activateInstitutionally({
      featureKey,
      environmentDefinitionId: body.environmentDefinitionId,
      activatedByIdentityId: session.identityId,
    });
  }
}
