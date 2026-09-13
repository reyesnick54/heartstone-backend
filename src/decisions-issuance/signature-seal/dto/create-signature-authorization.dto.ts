import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSignatureAuthorizationDto {
  @ApiProperty()
  @IsUUID()
  signatoryIdentityId!: string;

  @ApiProperty()
  @IsUUID()
  officeholderId!: string;

  @ApiProperty()
  @IsUUID()
  institutionId!: string;

  @ApiProperty()
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permittedInstrumentTypes!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permittedDecisionTypeVersion?: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ enum: AssuranceLevel })
  @IsOptional()
  @IsEnum(AssuranceLevel)
  requiredIdentityAssuranceLevel?: AssuranceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresMfaAtSigning?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  credentialReferenceId?: string;
}
