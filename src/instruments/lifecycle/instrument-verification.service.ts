import { Injectable, NotFoundException } from '@nestjs/common';
import { LifecycleOfficialInstrumentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface PublicVerificationResult {
  instrumentNumber: string;
  status: LifecycleOfficialInstrumentStatus;
  verificationStatus: string;
  verifiedAt: Date;
  isCurrent: boolean;
}

export interface HistoricalStatusSnapshot {
  effectiveAt: Date;
  status: LifecycleOfficialInstrumentStatus;
  eventType: string;
}

@Injectable()
export class InstrumentVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async updateVerificationCache(
    instrumentId: string,
    status: LifecycleOfficialInstrumentStatus,
  ): Promise<void> {
    const verificationStatus = this.deriveVerificationStatus(status);

    await this.prisma.lifecycleOfficialInstrument.update({
      where: { id: instrumentId },
      data: {
        publicVerificationStatus: verificationStatus,
        publicVerificationUpdatedAt: new Date(),
        currentStatus: status,
      },
    });
  }

  async getPublicVerification(token: string): Promise<PublicVerificationResult> {
    const instrument = await this.prisma.lifecycleOfficialInstrument.findUnique({
      where: { publicVerificationToken: token },
    });

    if (!instrument) {
      throw new NotFoundException('Instrument verification token not found');
    }

    return {
      instrumentNumber: instrument.instrumentNumber,
      status: instrument.currentStatus,
      verificationStatus: instrument.publicVerificationStatus,
      verifiedAt: instrument.publicVerificationUpdatedAt,
      isCurrent: this.isCurrentStatus(instrument.currentStatus),
    };
  }

  async replayHistoricalStatus(
    instrumentId: string,
    at: Date,
  ): Promise<HistoricalStatusSnapshot[]> {
    const events = await this.prisma.instrumentLifecycleEvent.findMany({
      where: {
        instrumentId,
        effectiveAt: { lte: at },
      },
      orderBy: { effectiveAt: 'asc' },
    });

    return events.map((event) => ({
      effectiveAt: event.effectiveAt,
      status: event.newStatus,
      eventType: event.eventType,
    }));
  }

  async getStatusAt(instrumentId: string, at: Date): Promise<LifecycleOfficialInstrumentStatus | null> {
    const snapshot = await this.replayHistoricalStatus(instrumentId, at);
    if (snapshot.length === 0) {
      return null;
    }
    const last = snapshot.at(-1);
    return last?.status ?? null;
  }

  private deriveVerificationStatus(status: LifecycleOfficialInstrumentStatus): string {
    switch (status) {
      case LifecycleOfficialInstrumentStatus.EFFECTIVE:
      case LifecycleOfficialInstrumentStatus.ISSUED:
      case LifecycleOfficialInstrumentStatus.AMENDED:
      case LifecycleOfficialInstrumentStatus.VARIED:
      case LifecycleOfficialInstrumentStatus.RENEWED:
      case LifecycleOfficialInstrumentStatus.REINSTATED:
        return 'VALID';
      case LifecycleOfficialInstrumentStatus.SUSPENDED:
      case LifecycleOfficialInstrumentStatus.PARTIALLY_SUSPENDED:
        return 'SUSPENDED';
      case LifecycleOfficialInstrumentStatus.REVOKED:
      case LifecycleOfficialInstrumentStatus.REVOCATION_DECIDED:
        return 'REVOKED';
      case LifecycleOfficialInstrumentStatus.EXPIRED:
        return 'EXPIRED';
      case LifecycleOfficialInstrumentStatus.SURRENDERED:
        return 'SURRENDERED';
      case LifecycleOfficialInstrumentStatus.SUPERSEDED:
      case LifecycleOfficialInstrumentStatus.REPLACED:
        return 'SUPERSEDED';
      case LifecycleOfficialInstrumentStatus.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  private isCurrentStatus(status: LifecycleOfficialInstrumentStatus): boolean {
    const nonCurrent: LifecycleOfficialInstrumentStatus[] = [
      LifecycleOfficialInstrumentStatus.SUSPENDED,
      LifecycleOfficialInstrumentStatus.PARTIALLY_SUSPENDED,
      LifecycleOfficialInstrumentStatus.REVOKED,
      LifecycleOfficialInstrumentStatus.EXPIRED,
      LifecycleOfficialInstrumentStatus.SURRENDERED,
      LifecycleOfficialInstrumentStatus.SUPERSEDED,
      LifecycleOfficialInstrumentStatus.REPLACED,
      LifecycleOfficialInstrumentStatus.CLOSED,
    ];
    return !nonCurrent.includes(status);
  }
}
