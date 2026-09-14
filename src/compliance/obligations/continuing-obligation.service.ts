import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ContinuingObligationSourceType,
  ContinuingObligationStatus,
  DecisionConditionStatus,
  DecisionConditionType,
  ObligationScheduleStatus,
  ObligationStatusChangeActor,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceBoundaryService } from '../common/compliance-boundary.service';
import { ObligationRecurrenceService } from '../common/obligation-recurrence.service';
import { hashConditionText } from '../matters/compliance-matter.service';

export interface CreateObligationFromConditionInput {
  complianceMatterId: string;
  sourceDecisionConditionId: string;
  sourceInstrumentVersionId: string;
  obligationCode: string;
  responsibleParty: string;
  obligationType: Prisma.ContinuingObligationCreateInput['obligationType'];
  startDate: Date;
  dueDate?: Date;
  recurrenceConfiguration?: unknown;
  evidenceStandard?: string;
  reviewingOfficeId?: string;
  functionAuthorityRecordId?: string;
  noncomplianceConsequenceReference?: string;
  exceptionProcedureReference?: string;
  actorIdentityId?: string;
}

export interface RecordObligationStatusInput {
  obligationId: string;
  toStatus: ContinuingObligationStatus;
  actor: ObligationStatusChangeActor;
  changedByIdentityId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ContinuingObligationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
    private readonly recurrence: ObligationRecurrenceService,
  ) {}

  async listForMatter(complianceMatterId: string) {
    return this.prisma.continuingObligation.findMany({
      where: { complianceMatterId },
      include: {
        schedules: { orderBy: { occurrenceNumber: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        sourceDecisionCondition: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createFromApprovedCondition(input: CreateObligationFromConditionInput) {
    const condition = await this.prisma.decisionCondition.findUnique({
      where: { id: input.sourceDecisionConditionId },
    });

    if (!condition) {
      throw new NotFoundException(`DecisionCondition ${input.sourceDecisionConditionId} not found`);
    }

    if (condition.conditionType !== DecisionConditionType.ONGOING) {
      throw new BadRequestException(
        'Only approved continuing decision conditions may generate continuing obligations',
      );
    }

    if (
      condition.status !== DecisionConditionStatus.PENDING &&
      condition.status !== DecisionConditionStatus.SATISFIED
    ) {
      throw new BadRequestException(
        'Decision condition is not in an approvable state for obligation materialization',
      );
    }

    const approvedText = condition.description;
    const approvedHash = hashConditionText(approvedText);

    if (input.recurrenceConfiguration) {
      this.boundary.validateRecurrenceConfiguration(input.recurrenceConfiguration);
    }

    const obligation = await this.prisma.continuingObligation.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        sourceType: ContinuingObligationSourceType.DECISION_CONDITION,
        sourceDecisionConditionId: condition.id,
        sourceInstrumentVersionId: input.sourceInstrumentVersionId,
        obligationCode: input.obligationCode,
        description: approvedText,
        approvedConditionText: approvedText,
        approvedConditionTextHash: approvedHash,
        responsibleParty: input.responsibleParty,
        obligationType: input.obligationType,
        startDate: input.startDate,
        dueDate: input.dueDate,
        recurrenceConfiguration: input.recurrenceConfiguration
          ? (input.recurrenceConfiguration as Prisma.InputJsonValue)
          : undefined,
        evidenceStandard: input.evidenceStandard,
        reviewingOfficeId: input.reviewingOfficeId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        noncomplianceConsequenceReference: input.noncomplianceConsequenceReference,
        exceptionProcedureReference: input.exceptionProcedureReference,
        status: ContinuingObligationStatus.NOT_YET_DUE,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: ContinuingObligationStatus.NOT_YET_DUE,
            actorClassification: ObligationStatusChangeActor.COMPLIANCE_ADMIN,
            changedByIdentityId: input.actorIdentityId,
            reason: 'Continuing obligation materialized from approved decision condition',
          },
        },
      },
    });

    const occurrences = this.recurrence.generateOccurrences({
      startDate: input.startDate,
      initialDueDate: input.dueDate,
      recurrenceConfiguration: input.recurrenceConfiguration,
      throughDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    if (occurrences.length > 0) {
      await this.prisma.obligationSchedule.createMany({
        data: occurrences.map((occurrence) => ({
          continuingObligationId: obligation.id,
          occurrenceNumber: occurrence.occurrenceNumber,
          scheduledDueDate: occurrence.scheduledDueDate,
          lawfulDueDate: occurrence.lawfulDueDate,
          status: ObligationScheduleStatus.SCHEDULED,
        })),
      });
    }

    return this.findById(obligation.id);
  }

  async recordAdministrativeStatus(input: RecordObligationStatusInput) {
    this.boundary.assertAiCannotWaive(input.actor);
    this.boundary.assertHolderCannotSetSatisfied(input.actor, input.toStatus);
    this.boundary.assertActorMayChangeStatus(input.actor, input.toStatus);
    this.boundary.assertOverdueIsNotAutomaticViolation(input.reason);

    if (
      input.toStatus === ContinuingObligationStatus.SUBMITTED &&
      input.actor !== ObligationStatusChangeActor.HOLDER
    ) {
      throw new BadRequestException(
        'SUBMITTED records holder report receipt; it does not prove compliance',
      );
    }

    const obligation = await this.prisma.continuingObligation.findUnique({
      where: { id: input.obligationId },
    });

    if (!obligation) {
      throw new NotFoundException(`ContinuingObligation ${input.obligationId} not found`);
    }

    if (
      obligation.approvedConditionText &&
      obligation.description !== obligation.approvedConditionText
    ) {
      throw new ForbiddenException('Stored obligation description diverges from approved condition text');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.continuingObligation.update({
        where: { id: obligation.id },
        data: {
          status: input.toStatus,
          statusHistory: {
            create: {
              fromStatus: obligation.status,
              toStatus: input.toStatus,
              changedByIdentityId: input.changedByIdentityId,
              actorClassification: input.actor,
              reason: input.reason,
              metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
            },
          },
        },
      });

      if (input.toStatus === ContinuingObligationStatus.OVERDUE) {
        await tx.obligationSchedule.updateMany({
          where: {
            continuingObligationId: obligation.id,
            lawfulDueDate: { lt: new Date() },
            status: { in: [ObligationScheduleStatus.SCHEDULED, ObligationScheduleStatus.DUE] },
          },
          data: { status: ObligationScheduleStatus.MISSED },
        });
      }

      return saved;
    });

    return this.findById(updated.id);
  }

  async supersedeObligation(input: {
    obligationId: string;
    replacement: CreateObligationFromConditionInput;
    actorIdentityId?: string;
  }) {
    const existing = await this.findById(input.obligationId);

    const replacement = await this.createFromApprovedCondition({
      ...input.replacement,
      actorIdentityId: input.actorIdentityId,
    });

    await this.prisma.$transaction([
      this.prisma.continuingObligation.update({
        where: { id: existing.id },
        data: {
          status: ContinuingObligationStatus.SUPERSEDED,
          supersededByObligationId: replacement.id,
          statusHistory: {
            create: {
              fromStatus: existing.status,
              toStatus: ContinuingObligationStatus.SUPERSEDED,
              actorClassification: ObligationStatusChangeActor.COMPLIANCE_ADMIN,
              changedByIdentityId: input.actorIdentityId,
              reason: 'Superseded by authorized replacement obligation',
            },
          },
        },
      }),
      this.prisma.obligationSchedule.updateMany({
        where: { continuingObligationId: existing.id },
        data: { status: ObligationScheduleStatus.SUPERSEDED },
      }),
    ]);

    return {
      superseded: await this.findById(existing.id),
      replacement: await this.findById(replacement.id),
    };
  }

  async getStatusHistory(obligationId: string) {
    return this.prisma.obligationStatusHistory.findMany({
      where: { continuingObligationId: obligationId },
      orderBy: { changedAt: 'asc' },
    });
  }

  async findById(id: string) {
    const obligation = await this.prisma.continuingObligation.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: { occurrenceNumber: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        sourceDecisionCondition: true,
        supersededByObligation: true,
        supersedesObligation: true,
      },
    });

    if (!obligation) {
      throw new NotFoundException(`ContinuingObligation ${id} not found`);
    }

    return obligation;
  }
}
