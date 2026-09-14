import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  type FeeSchedule,
  FeeScheduleLifecycleStatus,
  type FeeScheduleVersion,
  FinancialAuditEventType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { FinancialBoundaryService } from '../common/financial-boundary.service';
import { FINANCIAL_REASON_CODES } from '../financial-administration.constants';

export interface CreateFeeScheduleInput {
  code: string;
  name: string;
  responsibleInstitutionId: string;
  responsibleDepartmentId: string;
  currency: string;
  actorIdentityId: string;
}

export interface CreateFeeScheduleVersionInput {
  feeScheduleId: string;
  version: string;
  governingSourceId: string;
  functionAuthorityRecordId?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  items: CreateFeeScheduleItemInput[];
  actorIdentityId: string;
  officeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
  actorRoleMarker?: string;
}

export interface CreateFeeScheduleItemInput {
  serviceId: string;
  serviceVersionId?: string;
  governmentServiceFeeDefinitionId?: string;
  feeCode: string;
  description: string;
  amountCents: number;
  currency: string;
  calculationMethod: string;
  unitBasis?: string;
  minimumAmountCents?: number;
  maximumAmountCents?: number;
  taxOrLevyTreatment?: string;
  waiverAllowed?: boolean;
  refundabilityRule?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface ApproveAndActivateVersionInput {
  feeScheduleVersionId: string;
  actorIdentityId: string;
  officeholderId: string;
  appointmentId?: string;
  delegationId?: string;
  functionAuthorityRecordId: string;
  actorRoleMarker?: string;
}

@Injectable()
export class FeeScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createSchedule(input: CreateFeeScheduleInput): Promise<FeeSchedule> {
    const schedule = await this.prisma.feeSchedule.create({
      data: {
        code: input.code,
        name: input.name,
        responsibleInstitutionId: input.responsibleInstitutionId,
        responsibleDepartmentId: input.responsibleDepartmentId,
        currency: input.currency,
        status: FeeScheduleLifecycleStatus.DRAFT,
      },
    });

    await this.recordAuditEvent({
      entityType: 'FeeSchedule',
      entityId: schedule.id,
      eventType: FinancialAuditEventType.FEE_SCHEDULE_CREATED,
      actorIdentityId: input.actorIdentityId,
      details: { code: input.code },
    });

    return schedule;
  }

  async createVersion(input: CreateFeeScheduleVersionInput): Promise<FeeScheduleVersion> {
    const schedule = await this.prisma.feeSchedule.findUnique({
      where: { id: input.feeScheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Fee schedule not found');
    }

    for (const item of input.items) {
      if (item.currency.toUpperCase() !== schedule.currency.toUpperCase()) {
        throw new BadRequestException(FINANCIAL_REASON_CODES.CURRENCY_MISMATCH);
      }
    }

    const version = await this.prisma.$transaction(async (tx) => {
      const created = await tx.feeScheduleVersion.create({
        data: {
          feeScheduleId: input.feeScheduleId,
          version: input.version,
          governingSourceId: input.governingSourceId,
          functionAuthorityRecordId: input.functionAuthorityRecordId,
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil,
          status: FeeScheduleLifecycleStatus.DRAFT,
          items: {
            create: input.items.map((item) => ({
              serviceId: item.serviceId,
              serviceVersionId: item.serviceVersionId,
              governmentServiceFeeDefinitionId: item.governmentServiceFeeDefinitionId,
              feeCode: item.feeCode,
              description: item.description,
              amountCents: item.amountCents,
              currency: item.currency,
              calculationMethod: item.calculationMethod as never,
              unitBasis: item.unitBasis,
              minimumAmountCents: item.minimumAmountCents,
              maximumAmountCents: item.maximumAmountCents,
              taxOrLevyTreatment: item.taxOrLevyTreatment,
              waiverAllowed: item.waiverAllowed ?? false,
              refundabilityRule: (item.refundabilityRule ?? 'NON_REFUNDABLE') as never,
              effectiveFrom: item.effectiveFrom,
              effectiveUntil: item.effectiveUntil,
            })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    await this.recordAuditEvent({
      entityType: 'FeeScheduleVersion',
      entityId: version.id,
      eventType: FinancialAuditEventType.FEE_SCHEDULE_VERSION_CREATED,
      actorIdentityId: input.actorIdentityId,
      details: { version: input.version, feeScheduleId: input.feeScheduleId },
    });

    return version;
  }

  async approveAndActivateVersion(
    input: ApproveAndActivateVersionInput,
  ): Promise<FeeScheduleVersion> {
    this.boundary.assertTechnicalAdminCannotActivateFeeSchedule(input.actorRoleMarker);

    const version = await this.prisma.feeScheduleVersion.findUnique({
      where: { id: input.feeScheduleVersionId },
      include: { feeSchedule: true, items: true },
    });

    if (!version) {
      throw new NotFoundException('Fee schedule version not found');
    }

    if (version.status === FeeScheduleLifecycleStatus.ACTIVE) {
      throw new BadRequestException('ACTIVE schedule versions are immutable');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.actorIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.ADMINISTER,
      officeholderId: input.officeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(FINANCIAL_REASON_CODES.MISSING_AUTHORITY);
    }

    const now = new Date();

    const activated = await this.prisma.$transaction(async (tx) => {
      const priorActive = await tx.feeScheduleVersion.findFirst({
        where: {
          feeScheduleId: version.feeScheduleId,
          status: FeeScheduleLifecycleStatus.ACTIVE,
        },
      });

      if (priorActive) {
        await tx.feeScheduleVersion.update({
          where: { id: priorActive.id },
          data: { status: FeeScheduleLifecycleStatus.SUPERSEDED },
        });

        await tx.financialAuditEvent.create({
          data: {
            entityType: 'FeeScheduleVersion',
            entityId: priorActive.id,
            eventType: FinancialAuditEventType.FEE_SCHEDULE_VERSION_SUPERSEDED,
            actorIdentityId: input.actorIdentityId,
            details: { supersededBy: input.feeScheduleVersionId },
          },
        });
      }

      const updated = await tx.feeScheduleVersion.update({
        where: { id: input.feeScheduleVersionId },
        data: {
          status: FeeScheduleLifecycleStatus.ACTIVE,
          approvedByOfficeholderId: input.officeholderId,
          approvedAt: now,
          authorityEvaluationRecordId: authorityResult.evaluationId,
        },
        include: { items: true },
      });

      await tx.feeSchedule.update({
        where: { id: version.feeScheduleId },
        data: { status: FeeScheduleLifecycleStatus.ACTIVE },
      });

      return updated;
    });

    await this.recordAuditEvent({
      entityType: 'FeeScheduleVersion',
      entityId: activated.id,
      eventType: FinancialAuditEventType.FEE_SCHEDULE_VERSION_ACTIVATED,
      actorIdentityId: input.actorIdentityId,
      details: { authorityEvaluationRecordId: authorityResult.evaluationId },
    });

    return activated;
  }

  async listSchedules(): Promise<FeeSchedule[]> {
    return this.prisma.feeSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSchedule(id: string): Promise<FeeSchedule & { versions: FeeScheduleVersion[] }> {
    const schedule = await this.prisma.feeSchedule.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Fee schedule not found');
    }

    return schedule;
  }

  private async recordAuditEvent(params: {
    entityType: string;
    entityId: string;
    eventType: FinancialAuditEventType;
    actorIdentityId?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.financialAuditEvent.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        eventType: params.eventType,
        actorIdentityId: params.actorIdentityId,
        details: (params.details ?? {}) as never,
      },
    });
  }
}
