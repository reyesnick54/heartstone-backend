import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

import { DelegationTargetDto } from './delegation-target.dto';

export class CreateDelegationDto {
  @ApiProperty({ example: 'DEL-2026-001' })
  @IsString()
  @IsNotEmpty()
  referenceCode!: string;

  @ApiProperty({ example: 'Statutory Instrument 2026/42, Section 12' })
  @IsString()
  @IsNotEmpty()
  sourceReference!: string;

  @ApiProperty({ example: 'Administrative processing of permit applications' })
  @IsString()
  @IsNotEmpty()
  scopeDescription!: string;

  @ApiProperty({ enum: DelegationStatus, example: DelegationStatus.ACTIVE })
  @IsEnum(DelegationStatus)
  status!: DelegationStatus;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  effectiveUntil?: Date;

  @ApiProperty({ type: DelegationTargetDto })
  @ValidateNested()
  @Type(() => DelegationTargetDto)
  delegator!: DelegationTargetDto;

  @ApiProperty({ type: DelegationTargetDto })
  @ValidateNested()
  @Type(() => DelegationTargetDto)
  recipient!: DelegationTargetDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
