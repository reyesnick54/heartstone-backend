import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoverningSourceRelationshipType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateGoverningSourceRelationshipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  relatedSourceId!: string;

  @ApiProperty({ enum: GoverningSourceRelationshipType })
  @IsEnum(GoverningSourceRelationshipType)
  relationshipType!: GoverningSourceRelationshipType;

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
