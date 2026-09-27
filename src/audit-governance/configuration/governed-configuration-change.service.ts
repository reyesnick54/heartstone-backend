import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type GovernedConfigurationChange,
  GovernedConfigurationChangeStatus,
  type GovernedConfigurationDomain,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashAuditPayload } from '../common/audit-ledger-hash.util';
import { CanonicalAuditRecorderService } from '../ledger/canonical-audit-recorder.service';

export interface CreateGovernedConfigurationDraftInput {
  institutionId: string;
  jurisdictionId: string;
  configurationDomain: GovernedConfigurationDomain;
  configurationKey: string;
  proposedPayload: Record<string, unknown>;
  proposerIdentityId: string;
  correlationId?: string;
}

export interface SubmitGovernedConfigurationForReviewInput {
  changeId: string;
  actorIdentityId: string;
  reviewNotes?: string;
}

export interface ApproveGovernedConfigurationInput {
  changeId: string;
  approverIdentityId: string;
  scheduledEffectiveAt?: Date;
  approvalNotes?: string;
}

export interface RollbackGovernedConfigurationInput {
  institutionId: string;
  jurisdictionId: string;
  configurationDomain: GovernedConfigurationDomain;
  configurationKey: string;
  rollbackOfChangeId: string;
  proposerIdentityId: string;
  proposedPayload: Record<string, unknown>;
  approverIdentityId: string;
  scheduledEffectiveAt?: Date;
}

@Injectable()
export class GovernedConfigurationChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canonicalAudit: CanonicalAuditRecorderService,
  ) {}

  async createDraft(
    input: CreateGovernedConfigurationDraftInput,
  ): Promise<GovernedConfigurationChange> {
    const proposedPayloadHash = hashAuditPayload(input.proposedPayload);

    const change = await this.prisma.governedConfigurationChange.create({
      data: {
        institutionId: input.institutionId,
        jurisdictionId: input.jurisdictionId,
        configurationDomain: input.configurationDomain,
        configurationKey: input.configurationKey,
        status: GovernedConfigurationChangeStatus.DRAFT,
        proposedPayload: input.proposedPayload as Prisma.InputJsonObject,
        proposedPayloadHash,
        proposerIdentityId: input.proposerIdentityId,
        correlationId: input.correlationId,
      },
    });

    await this.canonicalAudit.recordGovernedConfigurationEvent({
      changeId: change.id,
      institutionId: change.institutionId,
      jurisdictionId: change.jurisdictionId,
      actorIdentityId: input.proposerIdentityId,
      action: 'CREATE_DRAFT',
      outcome: GovernedConfigurationChangeStatus.DRAFT,
      newStateHash: proposedPayloadHash,
    });

    return change;
  }

  async submitForReview(
    input: SubmitGovernedConfigurationForReviewInput,
  ): Promise<GovernedConfigurationChange> {
    const change = await this.getChangeOrThrow(input.changeId);

    if (change.status !== GovernedConfigurationChangeStatus.DRAFT) {
      throw new BadRequestException('Only draft configuration changes can be submitted for review');
    }

    if (change.proposerIdentityId !== input.actorIdentityId) {
      throw new ForbiddenException('Only the proposer may submit this configuration change');
    }

    const updated = await this.prisma.governedConfigurationChange.update({
      where: { id: change.id },
      data: {
        status: GovernedConfigurationChangeStatus.PROPOSED,
        proposedAt: change.proposedAt ?? new Date(),
        submittedForReviewAt: new Date(),
        reviewNotes: input.reviewNotes,
      },
    });

    await this.canonicalAudit.recordGovernedConfigurationEvent({
      changeId: updated.id,
      institutionId: updated.institutionId,
      jurisdictionId: updated.jurisdictionId,
      actorIdentityId: input.actorIdentityId,
      action: 'SUBMIT_FOR_REVIEW',
      outcome: GovernedConfigurationChangeStatus.PROPOSED,
      priorStateHash: change.proposedPayloadHash,
      newStateHash: change.proposedPayloadHash,
    });

    return updated;
  }

  async beginReview(
    changeId: string,
    actorIdentityId: string,
  ): Promise<GovernedConfigurationChange> {
    const change = await this.getChangeOrThrow(changeId);

    if (change.status !== GovernedConfigurationChangeStatus.PROPOSED) {
      throw new BadRequestException('Only proposed configuration changes can enter review');
    }

    const updated = await this.prisma.governedConfigurationChange.update({
      where: { id: change.id },
      data: { status: GovernedConfigurationChangeStatus.IN_REVIEW },
    });

    await this.canonicalAudit.recordGovernedConfigurationEvent({
      changeId: updated.id,
      institutionId: updated.institutionId,
      jurisdictionId: updated.jurisdictionId,
      actorIdentityId,
      action: 'BEGIN_REVIEW',
      outcome: GovernedConfigurationChangeStatus.IN_REVIEW,
      priorStateHash: change.proposedPayloadHash,
      newStateHash: change.proposedPayloadHash,
    });

    return updated;
  }

  async approve(input: ApproveGovernedConfigurationInput): Promise<GovernedConfigurationChange> {
    const change = await this.getChangeOrThrow(input.changeId);

    if (change.status !== GovernedConfigurationChangeStatus.IN_REVIEW) {
      throw new BadRequestException('Only in-review configuration changes can be approved');
    }

    if (change.proposerIdentityId === input.approverIdentityId) {
      throw new ForbiddenException(
        'Configuration proposer cannot approve their own change (segregation of duties)',
      );
    }

    const now = new Date();
    const scheduled = input.scheduledEffectiveAt;
    const isFuture = scheduled !== undefined && scheduled.getTime() > now.getTime();

    const nextStatus = isFuture
      ? GovernedConfigurationChangeStatus.SCHEDULED
      : GovernedConfigurationChangeStatus.APPROVED;

    const updated = await this.prisma.governedConfigurationChange.update({
      where: { id: change.id },
      data: {
        status: nextStatus,
        approverIdentityId: input.approverIdentityId,
        approvedAt: now,
        scheduledEffectiveAt: scheduled,
        approvalNotes: input.approvalNotes,
      },
    });

    await this.canonicalAudit.recordGovernedConfigurationEvent({
      changeId: updated.id,
      institutionId: updated.institutionId,
      jurisdictionId: updated.jurisdictionId,
      actorIdentityId: input.approverIdentityId,
      action: 'APPROVE',
      outcome: nextStatus,
      priorStateHash: change.proposedPayloadHash,
      newStateHash: change.proposedPayloadHash,
      metadata: {
        scheduledEffectiveAt: scheduled?.toISOString() ?? null,
      },
    });

    if (!isFuture) {
      return this.activateApprovedChange(updated.id, now);
    }

    return updated;
  }

  async activateDueChanges(asOf: Date = new Date()): Promise<number> {
    const due = await this.prisma.governedConfigurationChange.findMany({
      where: {
        status: GovernedConfigurationChangeStatus.SCHEDULED,
        scheduledEffectiveAt: { lte: asOf },
      },
    });

    for (const change of due) {
      await this.activateApprovedChange(change.id, asOf);
    }

    return due.length;
  }

  async resolveEffectiveConfiguration(input: {
    institutionId: string;
    configurationDomain: GovernedConfigurationDomain;
    configurationKey: string;
    at: Date;
  }): Promise<{ payload: Prisma.JsonValue; payloadHash: string; changeId: string } | null> {
    const version = await this.prisma.governedConfigurationEffectiveVersion.findFirst({
      where: {
        institutionId: input.institutionId,
        configurationDomain: input.configurationDomain,
        configurationKey: input.configurationKey,
        effectiveFrom: { lte: input.at },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: input.at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!version) {
      return null;
    }

    return {
      payload: version.payload,
      payloadHash: version.payloadHash,
      changeId: version.changeId,
    };
  }

  async rollback(input: RollbackGovernedConfigurationInput): Promise<GovernedConfigurationChange> {
    const original = await this.getChangeOrThrow(input.rollbackOfChangeId);

    if (original.status !== GovernedConfigurationChangeStatus.EFFECTIVE) {
      throw new BadRequestException('Only effective configuration can be rolled back');
    }

    if (input.proposerIdentityId === input.approverIdentityId) {
      throw new ForbiddenException(
        'Rollback approver must differ from rollback proposer (segregation of duties)',
      );
    }

    const draft = await this.createDraft({
      institutionId: input.institutionId,
      jurisdictionId: input.jurisdictionId,
      configurationDomain: input.configurationDomain,
      configurationKey: input.configurationKey,
      proposedPayload: input.proposedPayload,
      proposerIdentityId: input.proposerIdentityId,
    });

    const submitted = await this.submitForReview({
      changeId: draft.id,
      actorIdentityId: input.proposerIdentityId,
    });

    await this.prisma.governedConfigurationChange.update({
      where: { id: submitted.id },
      data: { rollbackOfChangeId: original.id },
    });

    await this.beginReview(submitted.id, input.proposerIdentityId);

    const approved = await this.approve({
      changeId: submitted.id,
      approverIdentityId: input.approverIdentityId,
      scheduledEffectiveAt: input.scheduledEffectiveAt,
      approvalNotes: 'ROLLBACK',
    });

    await this.prisma.governedConfigurationChange.update({
      where: { id: original.id },
      data: {
        status: GovernedConfigurationChangeStatus.ROLLED_BACK,
        rolledBackAt: new Date(),
      },
    });

    await this.canonicalAudit.recordGovernedConfigurationEvent({
      changeId: original.id,
      institutionId: original.institutionId,
      jurisdictionId: original.jurisdictionId,
      actorIdentityId: input.approverIdentityId,
      action: 'MARK_ROLLED_BACK',
      outcome: GovernedConfigurationChangeStatus.ROLLED_BACK,
      priorStateHash: original.effectivePayloadHash ?? undefined,
      metadata: { rollbackChangeId: approved.id },
    });

    return approved;
  }

  private async activateApprovedChange(
    changeId: string,
    effectiveAt: Date,
  ): Promise<GovernedConfigurationChange> {
    const change = await this.getChangeOrThrow(changeId);

    if (
      change.status !== GovernedConfigurationChangeStatus.APPROVED &&
      change.status !== GovernedConfigurationChangeStatus.SCHEDULED
    ) {
      throw new BadRequestException('Only approved or scheduled changes can become effective');
    }

    if (
      change.scheduledEffectiveAt &&
      change.scheduledEffectiveAt.getTime() > effectiveAt.getTime()
    ) {
      throw new BadRequestException('Configuration change is not yet effective');
    }

    const priorEffective = await this.prisma.governedConfigurationEffectiveVersion.findFirst({
      where: {
        institutionId: change.institutionId,
        configurationDomain: change.configurationDomain,
        configurationKey: change.configurationKey,
        effectiveUntil: null,
      },
    });

    if (priorEffective) {
      await this.prisma.governedConfigurationEffectiveVersion.update({
        where: { id: priorEffective.id },
        data: { effectiveUntil: effectiveAt },
      });

      await this.prisma.governedConfigurationChange.update({
        where: { id: priorEffective.changeId },
        data: {
          status: GovernedConfigurationChangeStatus.SUPERSEDED,
          supersededAt: effectiveAt,
        },
      });
    }

    const effectivePayload = change.proposedPayload;
    const effectivePayloadHash = change.proposedPayloadHash;

    const updated = await this.prisma.governedConfigurationChange.update({
      where: { id: change.id },
      data: {
        status: GovernedConfigurationChangeStatus.EFFECTIVE,
        effectiveAt,
        effectivePayload: effectivePayload as Prisma.InputJsonValue,
        effectivePayloadHash,
      },
    });

    await this.prisma.governedConfigurationEffectiveVersion.create({
      data: {
        changeId: updated.id,
        institutionId: updated.institutionId,
        configurationDomain: updated.configurationDomain,
        configurationKey: updated.configurationKey,
        effectiveFrom: effectiveAt,
        payload: effectivePayload as Prisma.InputJsonValue,
        payloadHash: effectivePayloadHash,
      },
    });

    await this.canonicalAudit.recordGovernedConfigurationEvent({
      changeId: updated.id,
      institutionId: updated.institutionId,
      jurisdictionId: updated.jurisdictionId,
      actorIdentityId: updated.approverIdentityId ?? updated.proposerIdentityId,
      action: 'ACTIVATE_EFFECTIVE',
      outcome: GovernedConfigurationChangeStatus.EFFECTIVE,
      priorStateHash: priorEffective?.payloadHash,
      newStateHash: effectivePayloadHash,
    });

    return updated;
  }

  private async getChangeOrThrow(changeId: string): Promise<GovernedConfigurationChange> {
    const change = await this.prisma.governedConfigurationChange.findUnique({
      where: { id: changeId },
    });

    if (!change) {
      throw new NotFoundException(`Governed configuration change ${changeId} not found`);
    }

    return change;
  }
}
