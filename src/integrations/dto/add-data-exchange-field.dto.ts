import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataExchangeFieldClassification } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddDataExchangeFieldDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  fieldName!: string;

  @ApiProperty({ enum: DataExchangeFieldClassification })
  @IsEnum(DataExchangeFieldClassification)
  classification!: DataExchangeFieldClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
