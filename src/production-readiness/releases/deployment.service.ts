import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DeploymentRecordStatus,
  DeploymentVerificationStatus,
  PlatformEnvironmentClassification,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { ReleaseGovernanceService } from './release-governance.service';

export interface DeployReleaseInput {
  environmentDefinitionId: string;
  releaseArtifactId: string;
  artifactDigest: string;
  deployedByIdentityId: string;
  changeRequestId?: string;
  ciPipelineRunId?: string;
}

@Injectable()
export class DeploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly releaseGovernance: ReleaseGovernanceService,
  ) {}

  async deployRelease(input: DeployReleaseInput) {
    const environment = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: input.environmentDefinitionId },
    });

    if (input.ciPipelineRunId) {
      const ciRun = await this.prisma.ciPipelineRun.findUniqueOrThrow({
        where: { id: input.ciPipelineRunId },
      });
      this.boundary.assertCiGreenDoesNotAuthorizeProduction(ciRun.authorizesProduction);
    }

    await this.releaseGovernance.validateArtifactForDeployment(
      input.releaseArtifactId,
      input.artifactDigest,
    );

    const productionCapable: PlatformEnvironmentClassification[] = [
      PlatformEnvironmentClassification.PRODUCTION,
      PlatformEnvironmentClassification.PILOT,
      PlatformEnvironmentClassification.DISASTER_RECOVERY,
    ];
    const isProductionCapable = productionCapable.includes(environment.classification);

    this.boundary.assertProductionDeployRequiresExplicitApproval(
      environment.classification,
      !isProductionCapable || Boolean(input.changeRequestId),
    );

    if (isProductionCapable && !input.changeRequestId) {
      throw new BadRequestException(
        'Production-capable deployments require an approved change request',
      );
    }

    if (input.changeRequestId) {
      const changeRequest = await this.prisma.changeRequest.findUniqueOrThrow({
        where: { id: input.changeRequestId },
      });
      if (changeRequest.status !== 'APPROVED') {
        throw new BadRequestException('Change request must be approved before deployment');
      }
    }

    const deployment = await this.prisma.deploymentRecord.create({
      data: {
        environmentDefinitionId: input.environmentDefinitionId,
        releaseArtifactId: input.releaseArtifactId,
        changeRequestId: input.changeRequestId,
        deployedByIdentityId: input.deployedByIdentityId,
        status: DeploymentRecordStatus.COMPLETED,
        deployedAt: new Date(),
      },
    });

    await this.prisma.deploymentVerification.create({
      data: {
        deploymentRecordId: deployment.id,
        verificationType: 'POST_DEPLOYMENT_HEALTH',
        status: DeploymentVerificationStatus.PASSED,
        evidence: { artifactDigest: input.artifactDigest },
        verifiedAt: new Date(),
      },
    });

    return deployment;
  }
}
