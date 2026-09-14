import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationDirection } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateIntegrationVersionDto {
  @ApiProperty()
  @IsUUID()
  integrationDefinitionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  version!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  sourceSystem!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  destinationSystem!: string;

  @ApiProperty({ enum: IntegrationDirection })
  @IsEnum(IntegrationDirection)
  direction!: IntegrationDirection;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  protocol!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  dataContractVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  securityProfile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  privacyProfile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  retentionProfile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  availabilityExpectation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recoveryExpectation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fallbackProcedure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
