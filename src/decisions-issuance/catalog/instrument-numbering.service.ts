import { Injectable } from '@nestjs/common';
import { CatalogLifecycleStatus, InstrumentNumberReservationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentNumberConflictException } from '../common/exceptions/issuance.exceptions';
import { formatInstrumentNumber } from '../common/instrument-number.util';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class InstrumentNumberingService {
  constructor(private readonly prisma: PrismaService) {}

  async reserveNextNumber(
    numberingRuleId: string,
    institutionCode: string,
    tx?: TransactionClient,
  ): Promise<{ reservationId: string; reservedNumber: string }> {
    if (tx) {
      return this.reserveInTransaction(tx, numberingRuleId, institutionCode);
    }

    return this.prisma.$transaction((transaction) =>
      this.reserveInTransaction(transaction, numberingRuleId, institutionCode),
    );
  }

  private async reserveInTransaction(
    tx: TransactionClient,
    numberingRuleId: string,
    institutionCode: string,
  ): Promise<{ reservationId: string; reservedNumber: string }> {
    const rule = await tx.instrumentNumberingRule.findUnique({
      where: { id: numberingRuleId },
    });

    if (rule?.lifecycleStatus !== CatalogLifecycleStatus.ACTIVE) {
      throw new InstrumentNumberConflictException('Numbering rule is not active');
    }

    const year = new Date().getFullYear();
    let sequence = rule.currentSequence + 1;

    if (rule.sequenceScope === 'YEARLY' && rule.sequenceYear !== year) {
      sequence = 1;
    }

    const reservedNumber = formatInstrumentNumber(rule.formatPattern, {
      institutionCode,
      year,
      sequence,
    });

    const existing = await tx.instrumentNumberReservation.findUnique({
      where: {
        numberingRuleId_reservedNumber: {
          numberingRuleId,
          reservedNumber,
        },
      },
    });

    if (
      existing &&
      (existing.status === InstrumentNumberReservationStatus.RESERVED ||
        existing.status === InstrumentNumberReservationStatus.COMMITTED)
    ) {
      throw new InstrumentNumberConflictException(
        `Instrument number "${reservedNumber}" is already reserved or committed`,
      );
    }

    await tx.instrumentNumberingRule.update({
      where: { id: numberingRuleId },
      data: {
        currentSequence: sequence,
        sequenceYear: rule.sequenceScope === 'YEARLY' ? year : rule.sequenceYear,
      },
    });

    const reservation = await tx.instrumentNumberReservation.create({
      data: {
        numberingRuleId,
        reservedNumber,
        status: InstrumentNumberReservationStatus.RESERVED,
      },
    });

    return { reservationId: reservation.id, reservedNumber };
  }

  async commitReservation(
    reservationId: string,
    officialInstrumentId: string,
    tx: TransactionClient,
  ): Promise<void> {
    await tx.instrumentNumberReservation.update({
      where: { id: reservationId },
      data: {
        status: InstrumentNumberReservationStatus.COMMITTED,
        officialInstrumentId,
        committedAt: new Date(),
      },
    });
  }

  async releaseReservation(reservationId: string, tx?: TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.instrumentNumberReservation.update({
      where: { id: reservationId },
      data: {
        status: InstrumentNumberReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
    });
  }
}
