import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormConditionalAction, FormConditionalLogic } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateFormConditionClauseDto } from './create-form-condition-clause.dto';

export class CreateFormConditionalRuleDto {
  @ApiProperty({ enum: FormConditionalAction })
  @IsEnum(FormConditionalAction)
  action!: FormConditionalAction;

  @ApiProperty({ type: [CreateFormConditionClauseDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFormConditionClauseDto)
  conditions!: CreateFormConditionClauseDto[];

  @ApiPropertyOptional({ enum: FormConditionalLogic, default: FormConditionalLogic.AND })
  @IsOptional()
  @IsEnum(FormConditionalLogic)
  logic?: FormConditionalLogic;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
