import { ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDelegationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  scopeDescription?: string;

  @ApiPropertyOptional({ enum: DelegationStatus })
  @IsOptional()
  @IsEnum(DelegationStatus)
  status?: DelegationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string | null;
}
