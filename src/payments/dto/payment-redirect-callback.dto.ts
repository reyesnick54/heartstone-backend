import { PaymentIntentStatus } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class PaymentRedirectCallbackDto {
  @IsString()
  providerIntentReference!: string;

  @IsEnum(PaymentIntentStatus)
  claimedStatus!: PaymentIntentStatus;
}
