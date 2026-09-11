import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FunctionSourceRelationshipType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFunctionGoverningSourceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  governingSourceId!: string;

  @ApiPropertyOptional({ example: 'Section 14(2)(a)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  provisionCitation?: string;

  @ApiProperty({ enum: FunctionSourceRelationshipType })
  @IsEnum(FunctionSourceRelationshipType)
  relationshipType!: FunctionSourceRelationshipType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

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
}
