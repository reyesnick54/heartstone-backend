import { PaymentChannelCode } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class RegisterPaymentProviderDto {
  @IsString()
  providerCode!: string;

  @IsString()
  name!: string;

  @IsString()
  environment!: string;

  @IsOptional()
  @IsString()
  merchantAccountReference?: string;

  @IsArray()
  @IsString({ each: true })
  supportedCurrencies!: string[];

  @IsArray()
  @IsEnum(PaymentChannelCode, { each: true })
  supportedChannels!: PaymentChannelCode[];

  @IsOptional()
  @IsBoolean()
  webhookConfigured?: boolean;

  @IsOptional()
  @IsString()
  credentialReference?: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}
