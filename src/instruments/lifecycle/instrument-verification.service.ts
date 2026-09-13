import { Injectable, NotFoundException } from '@nestjs/common';
import { LifecycleInstrumentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface PublicVerificationResult {
  instrumentNumber: string;
  status: LifecycleInstrumentStatus;
  verificationStatus: string;
  verifiedAt: Date;
  isCurrent: boolean;
}

export interface HistoricalStatusSnapshot {
  effectiveAt: Date;
  status: LifecycleInstrumentStatus;
  eventType: string;
}

@Injectable()
export class InstrumentVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async updateVerificationCache(
    instrumentId: string,
    status: LifecycleInstrumentStatus,
  ): Promise<void> {
    const verificationStatus = this.deriveVerificationStatus(status);

    await this.prisma.lifecycleOfficialInstrument.update({
      where: { id: instrumentId },
      data: {
        publicVerificationStatus: verificationStatus,
        publicVerificationUpdatedAt: new Date(),
        lifecycleStatus: status,
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
      status: instrument.lifecycleStatus,
      verificationStatus: instrument.publicVerificationStatus,
      verifiedAt: instrument.publicVerificationUpdatedAt,
      isCurrent: this.isCurrentStatus(instrument.lifecycleStatus),
    };
  }

  async replayHistoricalStatus(
    instrumentId: string,
    at: Date,
  ): Promise<HistoricalStatusSnapshot[]> {
    const events = await this.prisma.instrumentLifecycleEvent.findMany({
      where: {
        lifecycleInstrumentId: instrumentId,
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

  async getStatusAt(instrumentId: string, at: Date): Promise<LifecycleInstrumentStatus | null> {
    const snapshot = await this.replayHistoricalStatus(instrumentId, at);
    if (snapshot.length === 0) {
      return null;
    }
    const last = snapshot.at(-1);
    return last?.status ?? null;
  }

  private deriveVerificationStatus(status: LifecycleInstrumentStatus): string {
    switch (status) {
      case LifecycleInstrumentStatus.EFFECTIVE:
      case LifecycleInstrumentStatus.ISSUED:
      case LifecycleInstrumentStatus.AMENDED:
      case LifecycleInstrumentStatus.VARIED:
      case LifecycleInstrumentStatus.RENEWED:
      case LifecycleInstrumentStatus.REINSTATED:
        return 'VALID';
      case LifecycleInstrumentStatus.SUSPENDED:
      case LifecycleInstrumentStatus.PARTIALLY_SUSPENDED:
        return 'SUSPENDED';
      case LifecycleInstrumentStatus.REVOKED:
      case LifecycleInstrumentStatus.REVOCATION_DECIDED:
        return 'REVOKED';
      case LifecycleInstrumentStatus.EXPIRED:
        return 'EXPIRED';
      case LifecycleInstrumentStatus.SURRENDERED:
        return 'SURRENDERED';
      case LifecycleInstrumentStatus.SUPERSEDED:
      case LifecycleInstrumentStatus.REPLACED:
        return 'SUPERSEDED';
      case LifecycleInstrumentStatus.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  private isCurrentStatus(status: LifecycleInstrumentStatus): boolean {
    const nonCurrent: LifecycleInstrumentStatus[] = [
      LifecycleInstrumentStatus.SUSPENDED,
      LifecycleInstrumentStatus.PARTIALLY_SUSPENDED,
      LifecycleInstrumentStatus.REVOKED,
      LifecycleInstrumentStatus.EXPIRED,
      LifecycleInstrumentStatus.SURRENDERED,
      LifecycleInstrumentStatus.SUPERSEDED,
      LifecycleInstrumentStatus.REPLACED,
      LifecycleInstrumentStatus.CLOSED,
    ];
    return !nonCurrent.includes(status);
  }
}
