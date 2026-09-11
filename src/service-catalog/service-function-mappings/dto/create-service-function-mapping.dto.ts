import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceFunctionMappingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceFunctionMappingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sequenceOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isConsequential?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  publicStageLabel?: string;

  @ApiPropertyOptional({ enum: ServiceFunctionMappingStatus })
  @IsOptional()
  @IsEnum(ServiceFunctionMappingStatus)
  status?: ServiceFunctionMappingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;
}
