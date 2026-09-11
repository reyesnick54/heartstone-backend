import { ApiPropertyOptional } from '@nestjs/swagger';
import { FunctionSourceInterpretationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateFunctionGoverningSourceDto {
  @ApiPropertyOptional({ example: 'Section 14(2)(a)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  provisionCitation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ enum: FunctionSourceInterpretationStatus })
  @IsOptional()
  @IsEnum(FunctionSourceInterpretationStatus)
  interpretationStatus?: FunctionSourceInterpretationStatus;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Actor identity required when resolving contested interpretation',
  })
  @IsOptional()
  @IsUUID()
  actorIdentityId?: string;
}
