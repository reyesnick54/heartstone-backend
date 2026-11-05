import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalHoldTargetType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class LegalHoldTargetDto {
  @ApiProperty({ enum: LegalHoldTargetType })
  @IsEnum(LegalHoldTargetType)
  targetType!: LegalHoldTargetType;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  targetReference!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recordsClassificationId?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** The officer placing the hold is the signed-in identity; it is not a request field. */
export class CreateLegalHoldDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  holdNumber!: string;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @ApiProperty({ description: 'Court order, statute or instruction requiring the hold' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  authorityReference!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @ApiProperty({ type: [LegalHoldTargetDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LegalHoldTargetDto)
  targets!: LegalHoldTargetDto[];
}

/** The releasing officer is the signed-in identity; permissions are resolved on the server. */
export class ReleaseLegalHoldDto {
  @ApiProperty({ description: 'Court order or instruction authorising release' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  releaseAuthorityReference!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  releaseReason!: string;
}
