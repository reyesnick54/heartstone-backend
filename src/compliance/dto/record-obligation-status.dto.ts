import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContinuingObligationStatus, ObligationStatusChangeActor } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class RecordObligationStatusDto {
  @ApiProperty({ enum: ContinuingObligationStatus })
  @IsEnum(ContinuingObligationStatus)
  toStatus!: ContinuingObligationStatus;

  @ApiPropertyOptional({ enum: ObligationStatusChangeActor })
  @IsOptional()
  @IsEnum(ObligationStatusChangeActor)
  actor?: ObligationStatusChangeActor;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
