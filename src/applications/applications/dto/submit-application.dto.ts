import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionChannel, SubmittedCapacity } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitApplicationDto {
  @ApiProperty({ description: 'Form answers keyed by field key' })
  @IsObject()
  answers!: Record<string, unknown>;

  @ApiProperty()
  @IsUUID()
  formVersionId!: string;

  @ApiProperty()
  @IsString()
  configurationFingerprint!: string;

  @ApiPropertyOptional({ enum: SubmissionChannel })
  @IsOptional()
  @IsEnum(SubmissionChannel)
  submissionChannel?: SubmissionChannel;

  @ApiPropertyOptional({ enum: SubmittedCapacity })
  @IsOptional()
  @IsEnum(SubmittedCapacity)
  submittedCapacity?: SubmittedCapacity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate submissions on retry.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'Payment metadata for intake tracking only. Does not establish approval.',
  })
  @IsOptional()
  @IsObject()
  paymentMetadata?: Record<string, unknown>;
}
