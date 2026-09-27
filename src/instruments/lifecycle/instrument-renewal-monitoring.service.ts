import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunicationChannelType,
  InstrumentRenewalMonitoringStatus,
  OfficialInstrumentStatus,
  OperationalJobRunStatus,
} from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationMessageService } from '../../operational-support/communications/communication-message.service';
import {
  OPERATIONAL_JOB_CODES,
  S16_BOUNDARY_DISCLAIMERS,
} from '../../operational-lifecycle/operational-lifecycle.constants';

@Injectable()
export class InstrumentRenewalMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationMessages: CommunicationMessageService,
  ) {}

  renewalBoundaryDisclaimer(): string {
    return S16_BOUNDARY_DISCLAIMERS.renewalReminderNotRenewal;
  }

  async registerSchedule(input: {
    instrumentId: string;
    expirationDate: Date;
    eligibilityWindowStart?: Date;
    eligibilityWindowEnd?: Date;
    renewalApplicationId?: string;
  }) {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: input.instrumentId },
    });
    if (!instrument) {
      throw new NotFoundException(`Instrument ${input.instrumentId} not found`);
    }
    if (!instrument.effectiveUntil && !input.expirationDate) {
      throw new BadRequestException(
        'Instrument expiration must be explicit for renewal monitoring',
      );
    }

    const expirationDate = input.expirationDate ?? instrument.effectiveUntil!;
    return this.prisma.instrumentRenewalMonitoringSchedule.upsert({
      where: { instrumentId: input.instrumentId },
      create: {
        instrumentId: input.instrumentId,
        expirationDate,
        eligibilityWindowStart: input.eligibilityWindowStart,
        eligibilityWindowEnd: input.eligibilityWindowEnd,
        renewalApplicationId: input.renewalApplicationId,
        monitoringStatus: InstrumentRenewalMonitoringStatus.ACTIVE,
      },
      update: {
        expirationDate,
        eligibilityWindowStart: input.eligibilityWindowStart,
        eligibilityWindowEnd: input.eligibilityWindowEnd,
        renewalApplicationId: input.renewalApplicationId,
      },
    });
  }

  computeDaysUntilExpiration(expirationDate: Date, asOf = new Date()): number {
    const ms = expirationDate.getTime() - asOf.getTime();
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  async processDueReminders(asOf = new Date()) {
    const schedules = await this.prisma.instrumentRenewalMonitoringSchedule.findMany({
      where: {
        monitoringStatus: {
          in: [
            InstrumentRenewalMonitoringStatus.ACTIVE,
            InstrumentRenewalMonitoringStatus.REMINDER_SENT,
            InstrumentRenewalMonitoringStatus.OVERDUE,
          ],
        },
      },
      include: { instrument: true },
    });

    const remindersSent: string[] = [];

    for (const schedule of schedules) {
      const daysUntil = this.computeDaysUntilExpiration(schedule.expirationDate, asOf);
      const inWindow =
        (!schedule.eligibilityWindowStart || asOf >= schedule.eligibilityWindowStart) &&
        (!schedule.eligibilityWindowEnd || asOf <= schedule.eligibilityWindowEnd);

      let reminderKind: string | null = null;
      if (daysUntil <= 0) {
        reminderKind = 'OVERDUE';
        if (schedule.monitoringStatus !== InstrumentRenewalMonitoringStatus.OVERDUE) {
          await this.prisma.instrumentRenewalMonitoringSchedule.update({
            where: { id: schedule.id },
            data: {
              monitoringStatus: InstrumentRenewalMonitoringStatus.OVERDUE,
              overdueMarkedAt: asOf,
            },
          });
        }
      } else if (inWindow && daysUntil <= 90) {
        reminderKind = 'UPCOMING';
      }

      if (!reminderKind) {
        continue;
      }

      const holderIdentityId = schedule.instrument.holderIdentityId;
      if (!holderIdentityId) {
        continue;
      }

      const message = await this.communicationMessages.createMessage({
        messageReference: generateReferenceNumber('REN-REM'),
        channelType: CommunicationChannelType.EMAIL,
        subject: 'Instrument renewal reminder',
        body: `Your regulated instrument is approaching expiry (${schedule.expirationDate.toISOString()}). ${this.renewalBoundaryDisclaimer()}`,
        caseId: schedule.instrument.caseId ?? undefined,
        recipients: [
          {
            recipientType: 'IDENTITY',
            recipientReference: holderIdentityId,
            recipientIdentityId: holderIdentityId,
          },
        ],
      });

      await this.prisma.instrumentRenewalReminder.create({
        data: {
          scheduleId: schedule.id,
          communicationMessageId: message.id,
          reminderKind,
        },
      });

      await this.prisma.instrumentRenewalMonitoringSchedule.update({
        where: { id: schedule.id },
        data: {
          lastReminderAt: asOf,
          monitoringStatus:
            reminderKind === 'OVERDUE'
              ? InstrumentRenewalMonitoringStatus.OVERDUE
              : InstrumentRenewalMonitoringStatus.REMINDER_SENT,
        },
      });

      remindersSent.push(schedule.id);
    }

    return { remindersSent, disclaimer: this.renewalBoundaryDisclaimer() };
  }

  assertPaymentDoesNotRenewInstrument(input: {
    paymentReceived: boolean;
    decisionFinalized: boolean;
  }): void {
    if (input.paymentReceived && !input.decisionFinalized) {
      throw new BadRequestException(S16_BOUNDARY_DISCLAIMERS.renewalReminderNotRenewal);
    }
  }

  async markRenewalInProgress(instrumentId: string, renewalApplicationId: string) {
    const schedule = await this.prisma.instrumentRenewalMonitoringSchedule.findUnique({
      where: { instrumentId },
    });
    if (!schedule) {
      throw new NotFoundException(
        `Renewal monitoring schedule for instrument ${instrumentId} not found`,
      );
    }

    return this.prisma.instrumentRenewalMonitoringSchedule.update({
      where: { id: schedule.id },
      data: {
        renewalApplicationId,
        monitoringStatus: InstrumentRenewalMonitoringStatus.RENEWAL_IN_PROGRESS,
      },
    });
  }

  isInstrumentExpired(
    instrumentStatus: OfficialInstrumentStatus,
    expirationDate: Date,
    asOf = new Date(),
  ): boolean {
    return (
      instrumentStatus === OfficialInstrumentStatus.EXPIRED ||
      expirationDate.getTime() <= asOf.getTime()
    );
  }
}

@Injectable()
export class OperationalJobRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renewalMonitoring: InstrumentRenewalMonitoringService,
  ) {}

  async runDueJobs(asOf = new Date()) {
    const definitions = await this.prisma.operationalJobDefinition.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: asOf } }],
      },
    });

    const results: {
      jobCode: string;
      status: OperationalJobRunStatus;
      summary?: string;
      error?: string;
    }[] = [];

    for (const definition of definitions) {
      const run = await this.prisma.operationalJobRun.create({
        data: { jobDefinitionId: definition.id, status: OperationalJobRunStatus.RUNNING },
      });

      try {
        let summary = 'No-op';
        if (definition.jobCode === OPERATIONAL_JOB_CODES.INSTRUMENT_RENEWAL_REMINDERS) {
          const outcome = await this.renewalMonitoring.processDueReminders(asOf);
          summary = `renewal reminders sent: ${outcome.remindersSent.length}`;
        }

        await this.prisma.operationalJobRun.update({
          where: { id: run.id },
          data: {
            status: OperationalJobRunStatus.SUCCEEDED,
            completedAt: new Date(),
            resultSummary: summary,
          },
        });

        await this.prisma.operationalJobDefinition.update({
          where: { id: definition.id },
          data: {
            lastRunAt: asOf,
            nextRunAt: new Date(asOf.getTime() + definition.intervalMs),
          },
        });

        results.push({
          jobCode: definition.jobCode,
          status: OperationalJobRunStatus.SUCCEEDED,
          summary,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown job failure';
        await this.prisma.operationalJobRun.update({
          where: { id: run.id },
          data: {
            status: OperationalJobRunStatus.FAILED,
            completedAt: new Date(),
            errorMessage: message,
          },
        });
        results.push({
          jobCode: definition.jobCode,
          status: OperationalJobRunStatus.FAILED,
          error: message,
        });
      }
    }

    return results;
  }
}
