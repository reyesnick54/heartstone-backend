import { Injectable, NotFoundException } from '@nestjs/common';
import { OfficialInstrumentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface PublicVerificationResult {
  instrumentNumber: string;
  status: OfficialInstrumentStatus;
  verificationStatus: string;
  verifiedAt: Date;
  isCurrent: boolean;
}

export interface HistoricalStatusSnapshot {
  effectiveAt: Date;
  status: OfficialInstrumentStatus;
  eventType: string;
}

@Injectable()
export class InstrumentVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async updateVerificationCache(
    instrumentId: string,
    status: OfficialInstrumentStatus,
  ): Promise<void> {
    const verificationStatus = this.deriveVerificationStatus(status);

    await this.prisma.officialInstrument.update({
      where: { id: instrumentId },
      data: {
        publicVerificationStatus: verificationStatus,
        publicVerificationUpdatedAt: new Date(),
        status,
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
      instrumentNumber: instrument.instrumentNumber ?? '',
      status: instrument.status,
      verificationStatus: instrument.publicVerificationStatus ?? 'UNKNOWN',
      verifiedAt: instrument.publicVerificationUpdatedAt ?? instrument.updatedAt,
      isCurrent: this.isCurrentStatus(instrument.status),
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

  async getStatusAt(instrumentId: string, at: Date): Promise<OfficialInstrumentStatus | null> {
    const snapshot = await this.replayHistoricalStatus(instrumentId, at);
    if (snapshot.length === 0) {
      return null;
    }
    const last = snapshot.at(-1);
    return last?.status ?? null;
  }

  private deriveVerificationStatus(status: OfficialInstrumentStatus): string {
    switch (status) {
      case OfficialInstrumentStatus.EFFECTIVE:
      case OfficialInstrumentStatus.ISSUED:
      case OfficialInstrumentStatus.AMENDED:
      case OfficialInstrumentStatus.VARIED:
      case OfficialInstrumentStatus.RENEWED:
      case OfficialInstrumentStatus.REINSTATED:
        return 'VALID';
      case OfficialInstrumentStatus.SUSPENDED:
      case OfficialInstrumentStatus.PARTIALLY_SUSPENDED:
        return 'SUSPENDED';
      case OfficialInstrumentStatus.REVOKED:
      case OfficialInstrumentStatus.REVOCATION_DECIDED:
        return 'REVOKED';
      case OfficialInstrumentStatus.EXPIRED:
        return 'EXPIRED';
      case OfficialInstrumentStatus.SURRENDERED:
        return 'SURRENDERED';
      case OfficialInstrumentStatus.SUPERSEDED:
      case OfficialInstrumentStatus.REPLACED:
        return 'SUPERSEDED';
      case OfficialInstrumentStatus.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  private isCurrentStatus(status: OfficialInstrumentStatus): boolean {
    const nonCurrent: OfficialInstrumentStatus[] = [
      OfficialInstrumentStatus.SUSPENDED,
      OfficialInstrumentStatus.PARTIALLY_SUSPENDED,
      OfficialInstrumentStatus.REVOKED,
      OfficialInstrumentStatus.EXPIRED,
      OfficialInstrumentStatus.SURRENDERED,
      OfficialInstrumentStatus.SUPERSEDED,
      OfficialInstrumentStatus.REPLACED,
      OfficialInstrumentStatus.CLOSED,
    ];
    return !nonCurrent.includes(status);
  }
}
