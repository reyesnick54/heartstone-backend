import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CreateFormFieldDto } from './create-form-field.dto';

export class CreateFormSectionDto {
  @ApiProperty({ example: 'applicant-details' })
  @IsString()
  @MinLength(1)
  sectionKey!: string;

  @ApiProperty({ example: { default: 'Applicant Details' } })
  @IsObject()
  title!: Record<string, unknown>;

  @ApiPropertyOptional({ example: { default: 'Provide your personal information' } })
  @IsOptional()
  @IsObject()
  description?: Record<string, unknown>;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @ApiProperty({ type: [CreateFormFieldDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  fields!: CreateFormFieldDto[];
}
