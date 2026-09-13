import { Injectable } from '@nestjs/common';
import { InstrumentReceiptAcknowledgment } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentDeliveryAuditService } from '../audit/instrument-delivery-audit.service';
import { InstrumentNotFoundException } from '../common/exceptions/decisions-issuance.exceptions';

export interface RecordInstrumentReceiptInput {
  officialInstrumentId: string;
  instrumentVersionId: string;
  recipientIdentityId?: string;
  recipientOrganizationId?: string;
  recipientReference?: string;
  receivedAt: Date;
  acknowledgmentMethod: InstrumentReceiptAcknowledgment['acknowledgmentMethod'];
  identityAssuranceLevel?: string;
  instrumentDeliveryId?: string;
  instrumentDeliveryAttemptId?: string;
  evidenceReference?: string;
  actorIdentityId?: string;
}

@Injectable()
export class InstrumentReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: InstrumentDeliveryAuditService,
  ) {}

  async recordReceipt(
    input: RecordInstrumentReceiptInput,
  ): Promise<InstrumentReceiptAcknowledgment> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: input.officialInstrumentId },
    });

    if (!instrument) {
      throw new InstrumentNotFoundException(input.officialInstrumentId);
    }

    const version = await this.prisma.officialInstrumentVersion.findFirst({
      where: {
        id: input.instrumentVersionId,
        officialInstrumentId: input.officialInstrumentId,
      },
    });

    if (!version) {
      throw new InstrumentNotFoundException(input.instrumentVersionId);
    }

    const receipt = await this.prisma.instrumentReceiptAcknowledgment.create({
      data: {
        officialInstrumentId: input.officialInstrumentId,
        instrumentVersionId: input.instrumentVersionId,
        recipientIdentityId: input.recipientIdentityId,
        recipientOrganizationId: input.recipientOrganizationId,
        recipientReference: input.recipientReference,
        receivedAt: input.receivedAt,
        acknowledgmentMethod: input.acknowledgmentMethod,
        identityAssuranceLevel: input.identityAssuranceLevel,
        instrumentDeliveryId: input.instrumentDeliveryId,
        instrumentDeliveryAttemptId: input.instrumentDeliveryAttemptId,
        evidenceReference: input.evidenceReference,
      },
    });

    await this.audit.record({
      officialInstrumentId: input.officialInstrumentId,
      instrumentVersionId: input.instrumentVersionId,
      instrumentDeliveryId: input.instrumentDeliveryId,
      eventType: 'RECEIPT_ACKNOWLEDGMENT',
      actorIdentityId: input.actorIdentityId ?? input.recipientIdentityId,
      metadata: {
        acknowledgmentMethod: input.acknowledgmentMethod,
        identityAssuranceLevel: input.identityAssuranceLevel,
      },
    });

    return receipt;
  }
}
