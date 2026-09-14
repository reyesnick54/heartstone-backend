import { PaymentChannelCode } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID()
  invoiceId!: string;

  @IsOptional()
  @IsUUID()
  payerIdentityId?: string;

  @IsOptional()
  @IsUUID()
  payerOrganizationId?: string;

  @IsString()
  providerCode!: string;

  @IsEnum(PaymentChannelCode)
  channel!: PaymentChannelCode;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsBoolean()
  isAiActor?: boolean;
}
