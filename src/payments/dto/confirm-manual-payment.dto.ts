import { ManualPaymentSource, PaymentChannelCode } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ConfirmManualPaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsUUID()
  payerIdentityId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  currency!: string;

  @IsEnum(ManualPaymentSource)
  source!: ManualPaymentSource;

  @IsString()
  bankOrCounterReference!: string;

  @IsString()
  evidenceReference!: string;

  @IsUUID()
  reviewerOfficeholderId!: string;

  @IsDateString()
  confirmationDate!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsEnum(PaymentChannelCode)
  channel?: PaymentChannelCode;

  @IsOptional()
  @IsBoolean()
  isAiActor?: boolean;
}
