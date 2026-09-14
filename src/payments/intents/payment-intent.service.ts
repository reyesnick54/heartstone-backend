import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentChannelCode,
  PaymentChannelDefinitionStatus,
  PaymentIntentStatus,
  PaymentProviderConfigurationStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentProviderRegistryService } from '../adapters/payment-provider-registry.service';
import { PaymentAllocationService } from '../allocations/payment-allocation.service';
import { hashPaymentPayload } from '../common/payment-hash.util';
import { nextSequentialReference } from '../common/payment-reference.util';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';
import { InvoiceService } from '../invoicing/invoice.service';
import {
  PAYMENT_INTENT_NUMBER_PREFIX,
  PAYMENT_TRANSACTION_NUMBER_PREFIX,
} from '../payments.constants';
import { PaymentReceiptService } from '../receipts/payment-receipt.service';

export interface CreatePaymentIntentInput {
  invoiceId: string;
  payerIdentityId: string;
  payerOrganizationId?: string;
  providerCode: string;
  channel: PaymentChannelCode;
  idempotencyKey?: string;
  isAiActor?: boolean;
}

@Injectable()
export class PaymentIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
    private readonly providerRegistry: PaymentProviderRegistryService,
    private readonly invoices: InvoiceService,
    private readonly allocations: PaymentAllocationService,
    private readonly receipts: PaymentReceiptService,
  ) {}

  async create(input: CreatePaymentIntentInput) {
    this.boundary.assertAiCannotExecutePayment('CREATE_PAYMENT_INTENT', input.isAiActor);
    this.boundary.rejectPciFields(input as unknown as Record<string, unknown>);

    if (input.idempotencyKey) {
      const existing = await this.prisma.paymentIntent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const invoice = await this.invoices.findById(input.invoiceId);
    if (invoice.status !== InvoiceStatus.ISSUED && invoice.status !== InvoiceStatus.PARTIALLY_PAID) {
      throw new BadRequestException('Payment intent requires an issued invoice with outstanding balance');
    }

    const outstanding = invoice.totalAmountCents - invoice.paidAmountCents;
    if (outstanding <= 0) {
      throw new BadRequestException('Invoice has no outstanding balance');
    }

    await this.assertChannelApproved(input.channel);
    const providerConfig = await this.assertProviderActive(input.providerCode, input.channel, invoice.currency);

    const provider = this.providerRegistry.resolve(input.providerCode);
    const providerResult = await provider.createPaymentIntent({
      invoiceId: invoice.id,
      amountCents: outstanding,
      currency: invoice.currency,
      channel: input.channel,
      payerReference: input.payerIdentityId,
    });

    const paymentIntentNumber = await nextSequentialReference(
      this.prisma,
      PAYMENT_INTENT_NUMBER_PREFIX,
      'paymentIntentNumber',
      'paymentIntent',
    );

    try {
      return await this.prisma.paymentIntent.create({
        data: {
          paymentIntentNumber,
          invoiceId: invoice.id,
          payerIdentityId: input.payerIdentityId,
          payerOrganizationId: input.payerOrganizationId,
          requestedAmountCents: outstanding,
          currency: invoice.currency,
          providerCode: input.providerCode,
          providerConfigurationId: providerConfig.id,
          channel: input.channel,
          providerIntentReference: providerResult.providerIntentReference,
          providerStatusRaw: providerResult.providerStatusRaw,
          status: providerResult.canonicalStatus,
          idempotencyKey: input.idempotencyKey,
          expiresAt: providerResult.expiresAt,
        },
      });
    } catch (error) {
      if (input.idempotencyKey && this.isUniqueConstraint(error)) {
        const existing = await this.prisma.paymentIntent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async handleClientRedirect(providerIntentReference: string, claimedStatus: PaymentIntentStatus) {
    this.boundary.assertRedirectCannotSettle(claimedStatus);
    const intent = await this.prisma.paymentIntent.findFirst({
      where: { providerIntentReference },
    });
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }
    return intent;
  }

  async settleFromWebhook(input: {
    providerCode: string;
    providerIntentReference: string;
    providerTransactionReference: string;
    amountCents: number;
    currency: string;
    providerStatusRaw: string;
    settlementReference?: string;
    payload: Record<string, unknown>;
    channel: PaymentChannelCode;
  }) {
    const intent = await this.prisma.paymentIntent.findFirst({
      where: {
        providerCode: input.providerCode,
        providerIntentReference: input.providerIntentReference,
      },
      include: { invoice: true },
    });
    if (!intent) {
      throw new NotFoundException('Payment intent not found for webhook settlement');
    }

    this.boundary.assertCurrencyMatch(intent.currency, input.currency);
    if (input.amountCents !== intent.requestedAmountCents) {
      throw new BadRequestException(
        'Amount mismatch detected; reconciliation safe-halted pending review',
      );
    }

    const existingTxn = await this.prisma.paymentTransaction.findFirst({
      where: {
        providerCode: input.providerCode,
        providerTransactionReference: input.providerTransactionReference,
        type: PaymentTransactionType.SETTLEMENT,
        status: PaymentTransactionStatus.COMPLETED,
      },
    });
    if (existingTxn) {
      return { intent, transaction: existingTxn, duplicate: true };
    }

    const transactionNumber = await nextSequentialReference(
      this.prisma,
      PAYMENT_TRANSACTION_NUMBER_PREFIX,
      'transactionNumber',
      'paymentTransaction',
    );

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.create({
        data: {
          transactionNumber,
          paymentIntentId: intent.id,
          invoiceId: intent.invoiceId,
          providerCode: input.providerCode,
          providerConfigurationId: intent.providerConfigurationId,
          providerTransactionReference: input.providerTransactionReference,
          type: PaymentTransactionType.SETTLEMENT,
          amountCents: input.amountCents,
          currency: input.currency,
          status: PaymentTransactionStatus.COMPLETED,
          occurredAt: new Date(),
          providerPayloadHash: hashPaymentPayload(input.payload),
          settlementReference: input.settlementReference,
        },
      });

      await tx.paymentTransactionEvent.create({
        data: {
          paymentTransactionId: transaction.id,
          eventType: 'SETTLEMENT_CONFIRMED',
          providerStatusRaw: input.providerStatusRaw,
          canonicalStatus: PaymentTransactionStatus.COMPLETED,
          payloadHash: hashPaymentPayload(input.payload),
          occurredAt: new Date(),
        },
      });

      const updatedIntent = await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: PaymentIntentStatus.SETTLED,
          providerStatusRaw: input.providerStatusRaw,
        },
      });

      await this.invoices.applySettledPayment(intent.invoiceId, input.amountCents, tx);
      await this.allocations.allocateSettlement(transaction.id, tx);
      const receipt = await this.receipts.issueForTransaction(transaction.id, input.channel, tx);

      return { intent: updatedIntent, transaction, receipt, duplicate: false };
    });
  }

  private async assertChannelApproved(channel: PaymentChannelCode) {
    const definition = await this.prisma.paymentChannelDefinition.findUnique({
      where: { code: channel },
    });
    if (definition?.status !== PaymentChannelDefinitionStatus.APPROVED) {
      throw new BadRequestException(
        `Payment channel ${channel} is not an approved active channel`,
      );
    }
    return definition;
  }

  private async assertProviderActive(
    providerCode: string,
    channel: PaymentChannelCode,
    currency: string,
  ) {
    const config = await this.prisma.paymentProviderConfiguration.findFirst({
      where: {
        providerCode,
        status: PaymentProviderConfigurationStatus.ACTIVE,
        supportedChannels: { has: channel },
        supportedCurrencies: { has: currency },
      },
    });
    if (!config) {
      throw new BadRequestException(
        `Provider ${providerCode} is not active for channel ${channel} and currency ${currency}`,
      );
    }
    return config;
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
