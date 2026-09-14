import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';
import { type Request } from 'express';

import { RequiresAuthority } from '../authority/policy/authority-policy.decorator';
import { AuthorityPolicyGuard } from '../authority/policy/authority-policy.guard';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { PaymentsBoundaryService } from './common/payments-boundary.service';
import { ConfirmManualPaymentDto } from './dto/confirm-manual-payment.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentRedirectCallbackDto } from './dto/payment-redirect-callback.dto';
import { RegisterPaymentProviderDto } from './dto/register-payment-provider.dto';
import { PaymentIntentService } from './intents/payment-intent.service';
import { InvoiceService } from './invoicing/invoice.service';
import { ManualPaymentService } from './manual/manual-payment.service';
import {
  PAYMENT_BOUNDARY_DISCLAIMER,
  PAYMENT_REDIRECT_DISCLAIMER,
} from './payments.constants';
import {
  PaymentChannelService,
  PaymentProviderConfigurationService,
} from './providers/payment-provider-configuration.service';
import { PaymentReceiptService } from './receipts/payment-receipt.service';
import { PaymentWebhookService } from './webhooks/payment-webhook.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly boundary: PaymentsBoundaryService,
    private readonly invoices: InvoiceService,
    private readonly paymentIntents: PaymentIntentService,
    private readonly webhooks: PaymentWebhookService,
    private readonly manualPayments: ManualPaymentService,
    private readonly channels: PaymentChannelService,
    private readonly providers: PaymentProviderConfigurationService,
    private readonly receipts: PaymentReceiptService,
  ) {}

  @Post('invoices')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a draft invoice' })
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    this.boundary.rejectClientInvoiceFields(dto as unknown as Record<string, unknown>);
    return this.invoices.createDraft({
      institutionId: dto.institutionId,
      payerIdentityId: dto.payerIdentityId,
      payerOrganizationId: dto.payerOrganizationId,
      caseId: dto.caseId,
      applicationId: dto.applicationId,
      currency: dto.currency,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      lines: dto.lines,
    });
  }

  @Post('invoices/:id/issue')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a draft invoice for collection' })
  async issueInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.issue(id);
  }

  @Post('intents')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent against an issued invoice' })
  async createIntent(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    this.boundary.rejectClientPaymentFields(dto as unknown as Record<string, unknown>);
    this.boundary.rejectPciFields(dto as unknown as Record<string, unknown>);
    return this.paymentIntents.create({
      invoiceId: dto.invoiceId,
      payerIdentityId: dto.payerIdentityId ?? session.identityId,
      payerOrganizationId: dto.payerOrganizationId,
      providerCode: dto.providerCode,
      channel: dto.channel,
      idempotencyKey: dto.idempotencyKey,
      isAiActor: dto.isAiActor,
    });
  }

  @Post('redirect-callback')
  @ApiOperation({ summary: 'Record client redirect callback without settling payment' })
  async redirectCallback(@Body() dto: PaymentRedirectCallbackDto) {
    this.boundary.assertRedirectCannotSettle(dto.claimedStatus);
    const intent = await this.paymentIntents.handleClientRedirect(
      dto.providerIntentReference,
      dto.claimedStatus,
    );
    return {
      intent,
      disclaimer: PAYMENT_REDIRECT_DISCLAIMER,
    };
  }

  @Post('webhooks/:providerCode')
  @ApiOperation({ summary: 'Process provider webhook with signature validation' })
  async webhook(
    @Param('providerCode') providerCode: string,
    @Req() req: Request,
    @Body() payload: Record<string, unknown>,
  ) {
    const signature = String(req.headers['x-payment-signature'] ?? '');
    const timestamp = req.headers['x-payment-timestamp']
      ? String(req.headers['x-payment-timestamp'])
      : undefined;
    const rawBody = JSON.stringify(payload);
    return this.webhooks.process({
      providerCode,
      signature,
      timestamp,
      payload,
      rawBody,
    });
  }

  @Post('manual/confirm')
  @UseGuards(SessionAuthGuard, AuthorityPolicyGuard)
  @RequiresAuthority({ action: AuthorityActionType.CONFIRM_MANUAL_PAYMENT })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a manual bank or counter payment' })
  async confirmManual(@Body() dto: ConfirmManualPaymentDto) {
    const result = await this.manualPayments.confirm({
      invoiceId: dto.invoiceId,
      payerIdentityId: dto.payerIdentityId,
      amountCents: dto.amountCents,
      currency: dto.currency,
      source: dto.source,
      bankOrCounterReference: dto.bankOrCounterReference,
      evidenceReference: dto.evidenceReference,
      reviewerOfficeholderId: dto.reviewerOfficeholderId,
      confirmationDate: new Date(dto.confirmationDate),
      reason: dto.reason,
      channel: dto.channel,
      isAiActor: dto.isAiActor,
      authorityAction: AuthorityActionType.CONFIRM_MANUAL_PAYMENT,
    });
    return { ...result, disclaimer: PAYMENT_BOUNDARY_DISCLAIMER };
  }

  @Get('receipts/:id')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch an immutable payment receipt' })
  async getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    const receipt = await this.receipts.findById(id);
    return { receipt, disclaimer: PAYMENT_BOUNDARY_DISCLAIMER };
  }

  @Get('providers')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active payment provider configurations' })
  async listProviders() {
    return this.providers.listActive();
  }

  @Post('providers')
  @UseGuards(SessionAuthGuard, AuthorityPolicyGuard)
  @RequiresAuthority({ action: AuthorityActionType.ADMINISTER })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register payment provider configuration metadata' })
  async registerProvider(@Body() dto: RegisterPaymentProviderDto) {
    return this.providers.register(dto);
  }

  @Get('channels')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List approved payment channels' })
  async listChannels() {
    return this.channels.listApproved();
  }
}
