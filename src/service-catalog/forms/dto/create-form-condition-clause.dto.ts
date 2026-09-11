import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormConditionalOperator } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFormConditionClauseDto {
  @ApiProperty({ example: 'has_partner' })
  @IsString()
  @MinLength(1)
  fieldKey!: string;

  @ApiProperty({ enum: FormConditionalOperator })
  @IsEnum(FormConditionalOperator)
  operator!: FormConditionalOperator;

  @ApiPropertyOptional()
  @IsOptional()
  value?: unknown;
}
