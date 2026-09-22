import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyRegistryAuditEventType,
  PropertyTransactionHistoryEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryAuditService } from '../audit/property-registry-audit.service';
import { PropertyRegistryCadastreBoundaryService } from '../common/property-registry-cadastre-boundary.service';

@Injectable()
export class PropertyTransferPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryCadastreBoundaryService,
    private readonly audit: PropertyRegistryAuditService,
  ) {}

  async recordTransferFeePayment(input: {
    propertyTransferId: string;
    paymentTransactionId: string;
    actorIdentityId: string;
  }) {
    this.boundary.assertPaymentDoesNotChangeTitle(false);

    const transfer = await this.prisma.propertyTransfer.findUnique({
      where: { id: input.propertyTransferId },
    });

    if (!transfer) {
      throw new BadRequestException('Property transfer not found');
    }

    const updated = await this.prisma.propertyTransfer.update({
      where: { id: transfer.id },
      data: {
        transferFeePaymentTransactionId: input.paymentTransactionId,
      },
    });

    if (transfer.titleRecordId) {
      await this.prisma.propertyTransactionHistory.create({
        data: {
          titleRecordId: transfer.titleRecordId,
          propertyTransferId: transfer.id,
          eventType: PropertyTransactionHistoryEventType.FEE_PAYMENT,
          effectiveDate: new Date(),
          eventSummary: {
            paymentTransactionId: input.paymentTransactionId,
            mutatesTitle: false,
          } satisfies Prisma.InputJsonObject,
        },
      });
    }

    await this.audit.record({
      propertyTransferId: transfer.id,
      eventType: PropertyRegistryAuditEventType.TRANSFER_FEE_RECORDED,
      actorIdentityId: input.actorIdentityId,
      metadata: { paymentTransactionId: input.paymentTransactionId },
    });

    return updated;
  }
}
