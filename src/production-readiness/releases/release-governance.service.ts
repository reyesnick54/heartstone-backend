import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ReleaseApprovalStatus,
  ReleaseArtifact,
  ReleaseArtifactStatus,
  ReleaseDefinition,
  ReleaseDefinitionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface CreateReleaseDefinitionInput {
  version: string;
  sourceCommitSha: string;
  buildIdentifier: string;
  schemaMigrationSet?: unknown[];
  featureManifest?: unknown[];
  knownDefects?: unknown[];
  securityAssessmentRef?: string;
  testEvidenceRef?: string;
  releaseNotes?: string;
  configurationBaselineId?: string;
}

export interface RegisterArtifactInput {
  releaseDefinitionId: string;
  artifactDigest: string;
  sbomDigest: string;
  provenanceRef?: string;
}

@Injectable()
export class ReleaseGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createReleaseDefinition(input: CreateReleaseDefinitionInput): Promise<ReleaseDefinition> {
    return this.prisma.releaseDefinition.create({
      data: {
        version: input.version,
        sourceCommitSha: input.sourceCommitSha,
        buildIdentifier: input.buildIdentifier,
        schemaMigrationSet: (input.schemaMigrationSet ?? []) as Prisma.InputJsonValue,
        featureManifest: (input.featureManifest ?? []) as Prisma.InputJsonValue,
        knownDefects: (input.knownDefects ?? []) as Prisma.InputJsonValue,
        securityAssessmentRef: input.securityAssessmentRef,
        testEvidenceRef: input.testEvidenceRef,
        releaseNotes: input.releaseNotes,
        configurationBaselineId: input.configurationBaselineId,
        status: ReleaseDefinitionStatus.DRAFT,
      },
    });
  }

  async registerArtifact(input: RegisterArtifactInput): Promise<ReleaseArtifact> {
    const release = await this.prisma.releaseDefinition.findUnique({
      where: { id: input.releaseDefinitionId },
      include: { artifacts: true },
    });

    if (!release) {
      throw new NotFoundException(`ReleaseDefinition ${input.releaseDefinitionId} not found`);
    }

    const acceptedArtifact = release.artifacts.find(
      (artifact) => artifact.status === ReleaseArtifactStatus.ACCEPTED,
    );
    if (acceptedArtifact) {
      throw new BadRequestException(
        'Cannot register a new artifact after an artifact has been accepted',
      );
    }

    const artifact = await this.prisma.releaseArtifact.create({
      data: {
        releaseDefinitionId: input.releaseDefinitionId,
        artifactDigest: input.artifactDigest,
        sbomDigest: input.sbomDigest,
        provenanceRef: input.provenanceRef,
        status: ReleaseArtifactStatus.BUILT,
      },
    });

    await this.prisma.releaseDefinition.update({
      where: { id: input.releaseDefinitionId },
      data: { status: ReleaseDefinitionStatus.AWAITING_APPROVAL },
    });

    return artifact;
  }

  async acceptArtifact(artifactId: string): Promise<ReleaseArtifact> {
    const artifact = await this.prisma.releaseArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      throw new NotFoundException(`ReleaseArtifact ${artifactId} not found`);
    }

    this.boundary.assertUnbuiltArtifactCannotBeAccepted(artifact.status);

    if (artifact.immutable) {
      this.boundary.assertImmutableArtifactNotModified(true, true);
    }

    return this.prisma.releaseArtifact.update({
      where: { id: artifactId },
      data: {
        status: ReleaseArtifactStatus.ACCEPTED,
        acceptedAt: new Date(),
        immutable: true,
      },
    });
  }

  async approveRelease(input: {
    releaseArtifactId: string;
    approverIdentityId: string;
    notes?: string;
  }) {
    const artifact = await this.prisma.releaseArtifact.findUnique({
      where: { id: input.releaseArtifactId },
    });

    if (!artifact) {
      throw new NotFoundException(`ReleaseArtifact ${input.releaseArtifactId} not found`);
    }

    this.boundary.assertUnacceptedArtifactBlocked(artifact.status);

    const approval = await this.prisma.releaseApproval.create({
      data: {
        releaseArtifactId: input.releaseArtifactId,
        approverIdentityId: input.approverIdentityId,
        status: ReleaseApprovalStatus.APPROVED,
        artifactDigestAtApproval: artifact.artifactDigest,
        approvedAt: new Date(),
        notes: input.notes,
      },
    });

    await this.prisma.releaseDefinition.update({
      where: { id: artifact.releaseDefinitionId },
      data: { status: ReleaseDefinitionStatus.APPROVED },
    });

    return approval;
  }

  async validateArtifactForDeployment(
    artifactId: string,
    expectedDigest: string,
  ): Promise<ReleaseArtifact> {
    const artifact = await this.prisma.releaseArtifact.findUnique({
      where: { id: artifactId },
      include: { approvals: true },
    });

    if (!artifact) {
      throw new NotFoundException(`ReleaseArtifact ${artifactId} not found`);
    }

    this.boundary.assertUnacceptedArtifactBlocked(artifact.status);
    this.boundary.assertArtifactDigestMatches(artifact.artifactDigest, expectedDigest);

    const hasApproval = artifact.approvals.some(
      (approval) =>
        approval.status === ReleaseApprovalStatus.APPROVED &&
        approval.artifactDigestAtApproval === artifact.artifactDigest,
    );

    if (!hasApproval) {
      throw new BadRequestException('Release approval tied to exact artifact digest is required');
    }

    return artifact;
  }
}
