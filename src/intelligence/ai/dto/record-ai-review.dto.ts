import { AiHumanReviewOutcome } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordAiReviewDto {
  @IsUUID()
  callRecordId!: string;

  @IsEnum(AiHumanReviewOutcome)
  reviewOutcome!: AiHumanReviewOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  governmentRecordReference?: string;
}
