import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  GovernmentDecisionStatus,
  IdentityType,
  Prisma,
  type RedressDecision,
  RedressDecisionOutcome,
  RedressImplementationActionStatus,
  RedressImplementationTargetType,
  RedressMatterStatus,
  RedressReasonSectionType,
  RedressRemedyType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { hashRedressDecisionSnapshot } from '../common/redress-hash.util';
import { REDRESS_DECISION_NUMBER_PREFIX } from '../redress.constants';

export interface RedressFindingInput {
  issueReference: string;
  findingSummary: string;
  disposition?: string;
  sortOrder?: number;
}

export interface RedressReasonInput {
  sectionType: RedressReasonSectionType;
  content: string;
  aiDrafted?: boolean;
  humanConfirmed?: boolean;
  sortOrder?: number;
}

export interface RedressRemedyInput {
  remedyType: RedressRemedyType;
  description: string;
  targetReference?: string;
  sortOrder?: number;
}

export interface RecordRedressDecisionInput {
  redressMatterId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  appointmentId?: string;
  delegationId?: string;
  actorType: IdentityType;
  actorRoleMarker?: string;
  outcome: RedressDecisionOutcome;
  decidedAt: Date;
  effectiveAt?: Date;
  additionalEvidenceCutoff?: Date;
  findings: RedressFindingInput[];
  reasons: RedressReasonInput[];
  remedies: RedressRemedyInput[];
  remand?: {
    scope: Record<string, unknown>;
    issues: string[];
    authorityReference: string;
    evidenceConstraints?: Record<string, unknown>;
    deadline?: Date;
    interimEffect?: Record<string, unknown>;
  };
}

@Injectable()
export class RedressDecisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
  ) {}

  async recordDecision(input: RecordRedressDecisionInput): Promise<RedressDecision> {
    this.boundary.assertTechnicalAdminCannotCreateDecision(input.actorRoleMarker);
    this.boundary.assertHumanReviewer(input.actorType);

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.redressMatterId },
      include: {
        routeVersion: true,
        challengedDecision: true,
      },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.redressMatterId} not found`);
    }

    const routeVersion = matter.routeVersion;
    const permissibleOutcomes = routeVersion.permissibleOutcomes as string[];
    const permissibleRemedies = routeVersion.permissibleRemedies as string[];

    this.boundary.assertOutcomePermittedForRoute(input.outcome, permissibleOutcomes);
    this.boundary.assertIndependenceRequired(
      routeVersion.requiresIndependenceFromOriginalReviewer,
      matter.originalDecisionMakerOfficeholderId,
      input.reviewerOfficeholderId,
    );
    this.boundary.assertReasonedDeterminationRequired(
      routeVersion.requiresReasonedDetermination,
      input.reasons.map((reason) => ({
        humanConfirmed: reason.humanConfirmed ?? true,
      })),
    );

    for (const remedy of input.remedies) {
      this.boundary.assertRemedyPermittedForRoute(remedy.remedyType, permissibleRemedies);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.reviewerIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException(
        'Only authorized human officeholders may make final redress decisions',
      );
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.reviewerIdentityId,
      functionAuthorityRecordId: routeVersion.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
      officeholderId: input.reviewerOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Fresh authority evaluation is required for final redress disposition',
      );
    }

    const snapshot = await this.prisma.redressReviewRecordSnapshot.create({
      data: {
        redressMatterId: matter.id,
        capturedByIdentityId: input.reviewerIdentityId,
        snapshotData: {
          matterId: matter.id,
          challengedDecisionId: matter.challengedDecisionId,
          challengedInstrumentId: matter.challengedInstrumentId,
          routeVersionId: routeVersion.id,
          capturedAt: input.decidedAt.toISOString(),
        },
      },
    });

    const redressDecisionNumber = `${REDRESS_DECISION_NUMBER_PREFIX}-${String(Date.now())}-${matter.id.slice(0, 8)}`;
    const integrityHash = hashRedressDecisionSnapshot({
      redressMatterId: matter.id,
      outcome: input.outcome,
      decidedAt: input.decidedAt.toISOString(),
      reviewerOfficeholderId: input.reviewerOfficeholderId,
      authorityEvaluationRecordId: authorityResult.evaluationId,
    });

    const preservesOriginal =
      input.outcome === RedressDecisionOutcome.SET_ASIDE ||
      input.outcome === RedressDecisionOutcome.REVERSED;

    const isRemand = input.outcome === RedressDecisionOutcome.RETURNED_OR_REMANDED;

    const decision = await this.prisma.redressDecision.create({
      data: {
        redressDecisionNumber,
        redressMatterId: matter.id,
        routeVersionId: routeVersion.id,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        functionAuthorityRecordId: routeVersion.functionAuthorityRecordId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        redressReviewRecordSnapshotId: snapshot.id,
        additionalEvidenceCutoff: input.additionalEvidenceCutoff,
        outcome: input.outcome,
        decidedAt: input.decidedAt,
        effectiveAt: input.effectiveAt,
        supersededDecisionId: preservesOriginal ? matter.challengedDecisionId : undefined,
        remandScope: isRemand ? (input.remand?.scope as Prisma.InputJsonValue) : undefined,
        remandIssues: isRemand ? (input.remand?.issues ?? []) : [],
        remandAuthorityReference: isRemand ? input.remand?.authorityReference : undefined,
        remandEvidenceConstraints: isRemand
          ? (input.remand?.evidenceConstraints as Prisma.InputJsonValue)
          : undefined,
        remandDeadline: isRemand ? input.remand?.deadline : undefined,
        originalDecisionStatusPreserved: isRemand
          ? matter.challengedDecision.decisionStatus
          : preservesOriginal
            ? matter.challengedDecision.decisionStatus
            : undefined,
        remandInterimEffect: isRemand
          ? (input.remand?.interimEffect as Prisma.InputJsonValue)
          : undefined,
        integrityHash,
        findings: {
          create: input.findings.map((finding, index) => ({
            issueReference: finding.issueReference,
            findingSummary: finding.findingSummary,
            disposition: finding.disposition,
            sortOrder: finding.sortOrder ?? index,
          })),
        },
        reasons: {
          create: input.reasons.map((reason, index) => ({
            sectionType: reason.sectionType,
            content: reason.content,
            aiDrafted: reason.aiDrafted ?? false,
            humanConfirmed: reason.humanConfirmed ?? true,
            sortOrder: reason.sortOrder ?? index,
          })),
        },
        remedies: {
          create: input.remedies.map((remedy, index) => ({
            remedyType: remedy.remedyType,
            description: remedy.description,
            targetReference: remedy.targetReference,
            sortOrder: remedy.sortOrder ?? index,
          })),
        },
      },
      include: {
        findings: true,
        reasons: true,
        remedies: true,
      },
    });

    if (preservesOriginal) {
      if (matter.challengedDecision.decisionStatus === GovernmentDecisionStatus.SET_ASIDE) {
        throw new BadRequestException(
          'Original GovernmentDecision is preserved and must not be hard deleted',
        );
      }
    }

    await this.prisma.redressMatter.update({
      where: { id: matter.id },
      data: { status: RedressMatterStatus.IMPLEMENTATION_PENDING },
    });

    await this.prisma.redressImplementationPlan.create({
      data: {
        redressDecisionId: decision.id,
        status: RedressImplementationActionStatus.PENDING,
        actions: {
          create: input.remedies.map((remedy) => ({
            targetType: this.mapRemedyToTarget(remedy.remedyType),
            targetReference: remedy.targetReference ?? matter.challengedDecisionId,
            requiredOperation: remedy.remedyType,
            status: RedressImplementationActionStatus.PENDING,
            lifecycleServiceReference: this.resolveLifecycleServiceReference(remedy.remedyType),
          })),
        },
      },
    });

    return decision;
  }

  private isInstrumentRemedy(remedyType: RedressRemedyType): boolean {
    return (
      remedyType === RedressRemedyType.AMEND_INSTRUMENT ||
      remedyType === RedressRemedyType.REINSTATE_INSTRUMENT ||
      remedyType === RedressRemedyType.SUSPEND_EFFECT
    );
  }

  private resolveLifecycleServiceReference(remedyType: RedressRemedyType): string | null {
    if (this.isInstrumentRemedy(remedyType)) {
      return 'InstrumentLifecycleService';
    }
    if (remedyType === RedressRemedyType.REFUND_IF_AUTHORIZED) {
      return 'PaymentsRefundLifecycleService';
    }
    return null;
  }

  private mapRemedyToTarget(remedyType: RedressRemedyType): RedressImplementationTargetType {
    if (this.isInstrumentRemedy(remedyType)) {
      return RedressImplementationTargetType.OFFICIAL_INSTRUMENT;
    }
    if (remedyType === RedressRemedyType.CORRECT_RECORD) {
      return RedressImplementationTargetType.MASTER_ADMINISTRATIVE_FILE;
    }
    if (remedyType === RedressRemedyType.REFUND_IF_AUTHORIZED) {
      return RedressImplementationTargetType.FEE;
    }
    return RedressImplementationTargetType.GOVERNMENT_DECISION;
  }
}
