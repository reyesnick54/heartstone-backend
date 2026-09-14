import { Injectable } from '@nestjs/common';
import {
  InstrumentTypePublicVerificationMode,
  InstrumentVerificationEventType,
  InstrumentVerificationRecord,
  InstrumentVerificationRequestSource,
  InstrumentVerificationStatus,
  OfficialInstrument,
  OfficialInstrumentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentDeliveryAuditService } from '../audit/instrument-delivery-audit.service';
import {
  InstrumentNotFoundException,
  InstrumentVerificationNotFoundException,
} from '../common/exceptions/decisions-issuance.exceptions';
import {
  buildVerificationUri,
  generateVerificationCode,
  hashClientReference,
} from '../common/verification-code.util';
import { InstrumentVerificationRateLimiterService } from './instrument-verification-rate-limiter.service';

export interface PublicInstrumentVerificationResponse {
  verificationStatus: InstrumentVerificationStatus;
  verificationTimestamp: string;
  verificationUri: string;
  qrReferenceDisclaimer: string;
  issuer?: string;
  instrumentType?: string;
  instrumentNumber?: string;
  effectiveDate?: string;
  expiryDate?: string;
  currentLifecycleStatus?: OfficialInstrumentStatus;
  scopeSummary?: string;
  holderDisplay?: string;
  currentVersionIndicator?: number;
}

export interface InternalInstrumentVerificationResponse extends PublicInstrumentVerificationResponse {
  officialInstrumentId: string;
  instrumentVersionId: string;
  lifecycleStatus: OfficialInstrumentStatus;
  deliveryCount: number;
  receiptCount: number;
}

@Injectable()
export class InstrumentVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: InstrumentDeliveryAuditService,
    private readonly rateLimiter: InstrumentVerificationRateLimiterService,
  ) {}

  async createVerificationRecord(
    officialInstrumentId: string,
    publicBaseUrl?: string,
  ): Promise<InstrumentVerificationRecord> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: officialInstrumentId },
      include: { currentVersion: true },
    });

    if (!instrument?.currentVersion) {
      throw new InstrumentNotFoundException(officialInstrumentId);
    }

    const verificationCode = generateVerificationCode();

    return this.prisma.instrumentVerificationRecord.create({
      data: {
        officialInstrumentId,
        instrumentVersionId: instrument.currentVersion.id,
        verificationCode,
        verificationUri: buildVerificationUri(verificationCode, publicBaseUrl),
      },
    });
  }

  async verifyPublic(
    verificationCode: string,
    clientReference?: string,
  ): Promise<PublicInstrumentVerificationResponse> {
    this.rateLimiter.assertAllowed(clientReference);

    const record = await this.prisma.instrumentVerificationRecord.findUnique({
      where: { verificationCode },
      include: {
        officialInstrument: {
          include: {
            instrumentTypeVersion: { include: { instrumentTypeDefinition: true } },
            issuerInstitution: true,
            holderIdentity: true,
            currentVersion: true,
          },
        },
        instrumentVersion: true,
      },
    });

    if (!record) {
      throw new InstrumentVerificationNotFoundException();
    }

    const verificationStatus = this.resolveVerificationStatus(record.officialInstrument);
    const response = this.buildPublicResponse(record, verificationStatus);

    await this.recordVerificationEvent({
      verificationRecordId: record.id,
      eventType: InstrumentVerificationEventType.VERIFICATION_REQUEST,
      requestSource: InstrumentVerificationRequestSource.PUBLIC,
      clientReference,
      returnedStatus: verificationStatus,
    });

    await this.audit.record({
      officialInstrumentId: record.officialInstrumentId,
      instrumentVersionId: record.instrumentVersionId,
      eventType: 'VERIFICATION_REQUEST',
      metadata: {
        requestSource: InstrumentVerificationRequestSource.PUBLIC,
        returnedStatus: verificationStatus,
      },
    });

    return response;
  }

  async verifyInternal(
    verificationCode: string,
    actorIdentityId: string,
  ): Promise<InternalInstrumentVerificationResponse> {
    const record = await this.prisma.instrumentVerificationRecord.findUnique({
      where: { verificationCode },
      include: {
        officialInstrument: {
          include: {
            instrumentTypeVersion: { include: { instrumentTypeDefinition: true } },
            issuerInstitution: true,
            holderIdentity: true,
            currentVersion: true,
            deliveries: true,
            receiptAcknowledgments: true,
          },
        },
        instrumentVersion: true,
      },
    });

    if (!record) {
      throw new InstrumentVerificationNotFoundException();
    }

    const verificationStatus = this.resolveVerificationStatus(record.officialInstrument);
    const publicResponse = this.buildPublicResponse(record, verificationStatus);

    await this.recordVerificationEvent({
      verificationRecordId: record.id,
      eventType: InstrumentVerificationEventType.INTERNAL_VERIFICATION,
      requestSource: InstrumentVerificationRequestSource.INTERNAL,
      actorIdentityId,
      returnedStatus: verificationStatus,
    });

    return {
      ...publicResponse,
      officialInstrumentId: record.officialInstrumentId,
      instrumentVersionId: record.instrumentVersionId,
      lifecycleStatus: record.officialInstrument.status,
      deliveryCount: record.officialInstrument.deliveries.length,
      receiptCount: record.officialInstrument.receiptAcknowledgments.length,
    };
  }

  resolveVerificationStatus(instrument: OfficialInstrument): InstrumentVerificationStatus {
    const now = new Date();

    if (instrument.status === OfficialInstrumentStatus.REVOKED) {
      return InstrumentVerificationStatus.REVOKED;
    }

    if (instrument.status === OfficialInstrumentStatus.SUSPENDED) {
      return InstrumentVerificationStatus.SUSPENDED;
    }

    if (instrument.status === OfficialInstrumentStatus.SUPERSEDED) {
      return InstrumentVerificationStatus.SUPERSEDED;
    }

    if (instrument.status === OfficialInstrumentStatus.REPLACED) {
      return InstrumentVerificationStatus.REPLACED;
    }

    if (instrument.effectiveFrom && instrument.effectiveFrom > now) {
      return InstrumentVerificationStatus.NOT_YET_EFFECTIVE;
    }

    if (instrument.effectiveUntil && instrument.effectiveUntil <= now) {
      return InstrumentVerificationStatus.EXPIRED;
    }

    if (instrument.status === OfficialInstrumentStatus.EXPIRED) {
      return InstrumentVerificationStatus.EXPIRED;
    }

    if (instrument.status === OfficialInstrumentStatus.ISSUED) {
      return InstrumentVerificationStatus.CURRENT;
    }

    return InstrumentVerificationStatus.UNKNOWN_OR_UNVERIFIABLE;
  }

  private buildPublicResponse(
    record: Prisma.InstrumentVerificationRecordGetPayload<{
      include: {
        officialInstrument: {
          include: {
            instrumentTypeVersion: { include: { instrumentTypeDefinition: true } };
            issuerInstitution: true;
            holderIdentity: true;
            currentVersion: true;
          };
        };
        instrumentVersion: true;
      };
    }>,
    verificationStatus: InstrumentVerificationStatus,
  ): PublicInstrumentVerificationResponse {
    const instrument = record.officialInstrument;
    const typeVersion = instrument.instrumentTypeVersion;
    const verificationTimestamp = new Date().toISOString();
    const scopeSummary = this.extractScopeSummary(instrument.scope);

    if (!typeVersion) {
      return {
        verificationStatus: InstrumentVerificationStatus.UNKNOWN_OR_UNVERIFIABLE,
        verificationTimestamp,
        verificationUri: record.verificationUri,
        qrReferenceDisclaimer:
          'A QR code or verification reference alone does not prove authenticity. Authenticity is established by the verification service against the signed or sealed official record.',
      };
    }

    if (
      typeVersion.publicVerificationMode === InstrumentTypePublicVerificationMode.NOT_PERMITTED ||
      typeVersion.restrictedClassification
    ) {
      return {
        verificationStatus: InstrumentVerificationStatus.NOT_PUBLICLY_DISCLOSABLE,
        verificationTimestamp,
        verificationUri: record.verificationUri,
        qrReferenceDisclaimer:
          'A QR code or verification reference alone does not prove authenticity. Authenticity is established by the verification service against the signed or sealed official record.',
      };
    }

    if (verificationStatus === InstrumentVerificationStatus.NOT_PUBLICLY_DISCLOSABLE) {
      return {
        verificationStatus,
        verificationTimestamp,
        verificationUri: record.verificationUri,
        qrReferenceDisclaimer:
          'A QR code or verification reference alone does not prove authenticity. Authenticity is established by the verification service against the signed or sealed official record.',
      };
    }

    const base: PublicInstrumentVerificationResponse = {
      verificationStatus,
      verificationTimestamp,
      verificationUri: record.verificationUri,
      qrReferenceDisclaimer:
        'A QR code or verification reference alone does not prove authenticity. Authenticity is established by the verification service against the signed or sealed official record.',
      issuer: instrument.issuerInstitution.name,
      instrumentType: typeVersion.instrumentTypeDefinition.name,
      instrumentNumber: instrument.instrumentNumber ?? undefined,
      effectiveDate: instrument.effectiveFrom?.toISOString(),
      expiryDate: instrument.effectiveUntil?.toISOString(),
      currentLifecycleStatus: instrument.status,
      currentVersionIndicator: record.instrumentVersion.versionNumber,
    };

    if (typeVersion.scopeSummaryPublic && scopeSummary) {
      base.scopeSummary = scopeSummary;
    }

    if (typeVersion.holderDisplayPermitted && instrument.holderIdentity) {
      base.holderDisplay = instrument.holderIdentity.displayName;
    }

    if (
      typeVersion.publicVerificationMode === InstrumentTypePublicVerificationMode.LIMITED &&
      verificationStatus !== InstrumentVerificationStatus.CURRENT
    ) {
      return {
        verificationStatus,
        verificationTimestamp,
        verificationUri: record.verificationUri,
        qrReferenceDisclaimer: base.qrReferenceDisclaimer,
        issuer: base.issuer,
        instrumentType: base.instrumentType,
        instrumentNumber: base.instrumentNumber,
        currentLifecycleStatus: instrument.status,
      };
    }

    return base;
  }

  private extractScopeSummary(scope: Prisma.JsonValue): string | undefined {
    if (typeof scope === 'string') {
      return scope;
    }

    if (scope && typeof scope === 'object' && !Array.isArray(scope)) {
      const summary = (scope as Record<string, unknown>).summary;
      if (typeof summary === 'string') {
        return summary;
      }

      return JSON.stringify(scope);
    }

    return undefined;
  }

  private async recordVerificationEvent(input: {
    verificationRecordId: string;
    eventType: InstrumentVerificationEventType;
    requestSource: InstrumentVerificationRequestSource;
    actorIdentityId?: string;
    clientReference?: string;
    returnedStatus: InstrumentVerificationStatus;
  }): Promise<void> {
    await this.prisma.instrumentVerificationEvent.create({
      data: {
        verificationRecordId: input.verificationRecordId,
        eventType: input.eventType,
        requestSource: input.requestSource,
        actorIdentityId: input.actorIdentityId,
        clientReferenceHash: input.clientReference
          ? hashClientReference(input.clientReference)
          : undefined,
        returnedStatus: input.returnedStatus,
      },
    });
  }
}
