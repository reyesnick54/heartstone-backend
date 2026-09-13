import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface PublicVerificationResult {
  instrumentNumber: string;
  status: InstrumentLifecycleStatus;
  verificationStatus: string;
  verifiedAt: Date;
  isCurrent: boolean;
}

export interface HistoricalStatusSnapshot {
  effectiveAt: Date;
  status: InstrumentLifecycleStatus;
  eventType: string;
}

@Injectable()
export class InstrumentVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async updateVerificationCache(
    officialInstrumentId: string,
    status: InstrumentLifecycleStatus,
  ): Promise<void> {
    const verificationStatus = this.deriveVerificationStatus(status);

    await this.prisma.officialInstrument.update({
      where: { id: officialInstrumentId },
      data: {
        publicVerificationStatus: verificationStatus,
        publicVerificationUpdatedAt: new Date(),
        lifecycleStatus: status,
      },
    });
  }

  async getPublicVerification(token: string): Promise<PublicVerificationResult> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { publicVerificationToken: token },
    });

    if (!instrument) {
      throw new NotFoundException('Instrument verification token not found');
    }

    return {
      instrumentNumber: instrument.instrumentNumber ?? instrument.id,
      status: instrument.lifecycleStatus,
      verificationStatus: instrument.publicVerificationStatus ?? 'UNKNOWN',
      verifiedAt: instrument.publicVerificationUpdatedAt ?? instrument.updatedAt,
      isCurrent: this.isCurrentStatus(instrument.lifecycleStatus),
    };
  }

  async replayHistoricalStatus(
    officialInstrumentId: string,
    at: Date,
  ): Promise<HistoricalStatusSnapshot[]> {
    const events = await this.prisma.instrumentLifecycleEvent.findMany({
      where: {
        officialInstrumentId,
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

  async getStatusAt(officialInstrumentId: string, at: Date): Promise<InstrumentLifecycleStatus | null> {
    const snapshot = await this.replayHistoricalStatus(officialInstrumentId, at);
    if (snapshot.length === 0) {
      return null;
    }
    const last = snapshot.at(-1);
    return last?.status ?? null;
  }

  private deriveVerificationStatus(status: InstrumentLifecycleStatus): string {
    switch (status) {
      case InstrumentLifecycleStatus.EFFECTIVE:
      case InstrumentLifecycleStatus.ISSUED:
      case InstrumentLifecycleStatus.AMENDED:
      case InstrumentLifecycleStatus.VARIED:
      case InstrumentLifecycleStatus.RENEWED:
      case InstrumentLifecycleStatus.REINSTATED:
        return 'VALID';
      case InstrumentLifecycleStatus.SUSPENDED:
      case InstrumentLifecycleStatus.PARTIALLY_SUSPENDED:
        return 'SUSPENDED';
      case InstrumentLifecycleStatus.REVOKED:
      case InstrumentLifecycleStatus.REVOCATION_DECIDED:
        return 'REVOKED';
      case InstrumentLifecycleStatus.EXPIRED:
        return 'EXPIRED';
      case InstrumentLifecycleStatus.SURRENDERED:
        return 'SURRENDERED';
      case InstrumentLifecycleStatus.SUPERSEDED:
      case InstrumentLifecycleStatus.REPLACED:
        return 'SUPERSEDED';
      case InstrumentLifecycleStatus.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  private isCurrentStatus(status: InstrumentLifecycleStatus): boolean {
    const nonCurrent: InstrumentLifecycleStatus[] = [
      InstrumentLifecycleStatus.SUSPENDED,
      InstrumentLifecycleStatus.PARTIALLY_SUSPENDED,
      InstrumentLifecycleStatus.REVOKED,
      InstrumentLifecycleStatus.EXPIRED,
      InstrumentLifecycleStatus.SURRENDERED,
      InstrumentLifecycleStatus.SUPERSEDED,
      InstrumentLifecycleStatus.REPLACED,
      InstrumentLifecycleStatus.CLOSED,
    ];
    return !nonCurrent.includes(status);
  }
}
