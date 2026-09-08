import { ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDelegationDto {
  @ApiPropertyOptional({ example: 'Statutory Instrument 2026/42, Section 12' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sourceReference?: string;

  @ApiPropertyOptional({ example: 'Administrative processing of permit applications' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  scopeDescription?: string;

  @ApiPropertyOptional({ enum: DelegationStatus })
  @IsEnum(DelegationStatus)
  @IsOptional()
  status?: DelegationStatus;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  effectiveUntil?: Date | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string | null;
}
