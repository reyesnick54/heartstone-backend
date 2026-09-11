import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormDataClassification, FormFieldType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CreateFormConditionalRuleDto } from './create-form-conditional-rule.dto';

export class CreateFormFieldDto {
  @ApiProperty({ example: 'full_name' })
  @IsString()
  @MinLength(1)
  fieldKey!: string;

  @ApiProperty({ example: { default: 'Full Name' } })
  @IsObject()
  label!: Record<string, unknown>;

  @ApiPropertyOptional({ example: { default: 'Legal name as shown on ID' } })
  @IsOptional()
  @IsObject()
  description?: Record<string, unknown>;

  @ApiProperty({ enum: FormFieldType })
  @IsEnum(FormFieldType)
  fieldType!: FormFieldType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @ApiPropertyOptional()
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ example: { default: 'Enter your full name' } })
  @IsOptional()
  @IsObject()
  placeholder?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: FormDataClassification, default: FormDataClassification.PUBLIC })
  @IsOptional()
  @IsEnum(FormDataClassification)
  dataClassification?: FormDataClassification;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  validationDefinition?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  sourceMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateFormConditionalRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormConditionalRuleDto)
  conditionalRules?: CreateFormConditionalRuleDto[];
}
