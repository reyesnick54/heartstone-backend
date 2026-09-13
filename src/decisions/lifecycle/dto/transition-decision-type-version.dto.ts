import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecisionTypeLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionDecisionTypeVersionDto {
  @ApiProperty({ enum: DecisionTypeLifecycleStatus })
  @IsEnum(DecisionTypeLifecycleStatus)
  targetStatus!: DecisionTypeLifecycleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
