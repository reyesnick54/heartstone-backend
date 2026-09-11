import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateFormSectionDto } from './create-form-section.dto';

export class CreateFormVersionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  formDefinitionId!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiProperty({
    example: {
      default: 'Business License Application',
      translations: { en: 'Business License Application' },
    },
  })
  @IsObject()
  title!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { default: 'Complete all required sections before continuing.' },
  })
  @IsOptional()
  @IsObject()
  instructions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiProperty({ type: [CreateFormSectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFormSectionDto)
  sections!: CreateFormSectionDto[];
}

export class CreateNextFormVersionDto {
  @ApiProperty({
    example: { default: 'Business License Application v2' },
  })
  @IsObject()
  title!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  instructions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiProperty({ type: [CreateFormSectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFormSectionDto)
  sections!: CreateFormSectionDto[];
}

export class UpdateDraftFormVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  title?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  instructions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}

export class ValidateFormResponseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  formVersionId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  answers!: Record<string, unknown>;
}
