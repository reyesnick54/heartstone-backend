import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConsequentialUseReviewDecision,
  DigitalTwinMode,
  DigitalTwinType,
  IdentityType,
  SimulationToLiveTransitionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface RecordConsequentialUseReviewInput {
  twinVersionId: string;
  simulationRunId?: string;
  simulationOutputId?: string;
  representedSubjectType: DigitalTwinType;
  representedSubjectId: string;
  impactAreas: string[];
  reviewerIdentityId: string;
  reviewerOfficeholderId?: string;
  reviewerIdentityType: IdentityType;
  reviewerRoleMarker?: string;
  authorityReference: string;
  evidenceReference?: string;
  decision: ConsequentialUseReviewDecision;
  reasons: string;
  limitations: string;
  conditions?: string;
  proposedUse: string;
  alternativesConsidered?: string;
  conflictNotes?: string;
  isAiActor?: boolean;
}

export interface ProposeLiveTransitionInput {
  twinVersionId: string;
  exactVersionLabel: string;
  acceptedMode: DigitalTwinMode;
  authorityReference: string;
  institutionalAcceptanceReference: string;
  rollbackPlanReference: string;
  testingCompleted?: boolean;
  securityReviewCompleted?: boolean;
  trainingCompleted?: boolean;
  technicalSuccessAcknowledged?: boolean;
  liveActivationAuthorized?: boolean;
  effectiveDate?: Date;
  suspensionTriggers?: string[];
}

@Injectable()
export class ConsequentialUseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async recordReview(input: RecordConsequentialUseReviewInput) {
    const version = await this.prisma.digitalTwinVersion.findUnique({
      where: { id: input.twinVersionId },
      include: {
        definition: true,
        sources: true,
      },
    });

    if (!version) {
      throw new NotFoundException(`DigitalTwinVersion ${input.twinVersionId} not found`);
    }

    this.boundary.assertTwinIntegrityForConsequentialUse(version.definition);
    this.boundary.assertSourcesDisclosedForConsequentialUse({ sources: version.sources });
    this.boundary.assertHumanReviewerForConsequentialUse(
      input.reviewerIdentityType,
      input.reviewerRoleMarker,
    );
    this.boundary.assertAiCannotFinalDecide('FINAL_DECIDE', input.isAiActor ?? false);

    const isStaleTwinBlocked =
      version.definition.isStale ||
      version.definition.isIncomplete ||
      version.definition.isCompromised;

    if (isStaleTwinBlocked && input.decision === ConsequentialUseReviewDecision.APPROVED) {
      this.boundary.assertTwinIntegrityForConsequentialUse(version.definition);
    }

    const missingDataDisclosed = version.sources.every((source) => source.isDisclosed);

    return this.prisma.consequentialUseReview.create({
      data: {
        twinVersionId: input.twinVersionId,
        simulationRunId: input.simulationRunId,
        simulationOutputId: input.simulationOutputId,
        representedSubjectType: input.representedSubjectType,
        representedSubjectId: input.representedSubjectId,
        impactAreas: input.impactAreas,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        authorityReference: input.authorityReference,
        evidenceReference: input.evidenceReference,
        decision: input.decision,
        reasons: input.reasons,
        limitations: input.limitations,
        conditions: input.conditions,
        proposedUse: input.proposedUse,
        alternativesConsidered: input.alternativesConsidered,
        conflictNotes: input.conflictNotes,
        isStaleTwinBlocked,
        missingDataDisclosed,
      },
    });
  }

  async proposeLiveTransition(input: ProposeLiveTransitionInput) {
    await this.ensureVersionExists(input.twinVersionId);
    this.boundary.assertModeIsNotOperationalControl(input.acceptedMode, false);
    this.boundary.assertLiveTransitionRequiresAcceptance({
      institutionalAcceptanceReference: input.institutionalAcceptanceReference,
      rollbackPlanReference: input.rollbackPlanReference,
      securityReviewCompleted: input.securityReviewCompleted ?? false,
      testingCompleted: input.testingCompleted ?? false,
      trainingCompleted: input.trainingCompleted ?? false,
      liveActivationAuthorized: input.liveActivationAuthorized ?? false,
      technicalSuccessAcknowledged: input.technicalSuccessAcknowledged ?? false,
    });

    const status =
      input.liveActivationAuthorized && input.institutionalAcceptanceReference
        ? SimulationToLiveTransitionStatus.ACCEPTED
        : input.technicalSuccessAcknowledged
          ? SimulationToLiveTransitionStatus.PENDING_ACCEPTANCE
          : SimulationToLiveTransitionStatus.PROPOSED;

    return this.prisma.simulationToLiveTransitionRecord.create({
      data: {
        twinVersionId: input.twinVersionId,
        exactVersionLabel: input.exactVersionLabel,
        acceptedMode: input.acceptedMode,
        authorityReference: input.authorityReference,
        institutionalAcceptanceReference: input.institutionalAcceptanceReference,
        rollbackPlanReference: input.rollbackPlanReference,
        testingCompleted: input.testingCompleted ?? false,
        securityReviewCompleted: input.securityReviewCompleted ?? false,
        trainingCompleted: input.trainingCompleted ?? false,
        technicalSuccessAcknowledged: input.technicalSuccessAcknowledged ?? false,
        liveActivationAuthorized: input.liveActivationAuthorized ?? false,
        effectiveDate: input.effectiveDate,
        suspensionTriggers: input.suspensionTriggers ?? [],
        status,
      },
    });
  }

  async findReviewById(id: string) {
    const review = await this.prisma.consequentialUseReview.findUnique({
      where: { id },
      include: { twinVersion: { include: { definition: true } } },
    });

    if (!review) {
      throw new NotFoundException(`ConsequentialUseReview ${id} not found`);
    }

    return review;
  }

  async assertConsequentialUsePermitted(twinVersionId: string): Promise<void> {
    const version = await this.prisma.digitalTwinVersion.findUnique({
      where: { id: twinVersionId },
      include: { definition: true, sources: true },
    });

    if (!version) {
      throw new NotFoundException(`DigitalTwinVersion ${twinVersionId} not found`);
    }

    this.boundary.assertTwinIntegrityForConsequentialUse(version.definition);
    this.boundary.assertSourcesDisclosedForConsequentialUse({ sources: version.sources });

    const approvedReview = await this.prisma.consequentialUseReview.findFirst({
      where: {
        twinVersionId,
        decision: {
          in: [ConsequentialUseReviewDecision.APPROVED, ConsequentialUseReviewDecision.CONDITIONAL],
        },
      },
      orderBy: { reviewedAt: 'desc' },
    });

    if (!approvedReview) {
      this.boundary.assertConsequentialReviewApproved(ConsequentialUseReviewDecision.SAFE_HALT);
    }
  }

  private async ensureVersionExists(twinVersionId: string) {
    const version = await this.prisma.digitalTwinVersion.findUnique({
      where: { id: twinVersionId },
    });

    if (!version) {
      throw new NotFoundException(`DigitalTwinVersion ${twinVersionId} not found`);
    }

    return version;
  }
}
