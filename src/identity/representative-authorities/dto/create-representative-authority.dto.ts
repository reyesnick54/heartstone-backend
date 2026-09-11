import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepresentativeAuthorityStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRepresentativeAuthorityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  identityId!: string;

  @ApiProperty({ example: 'Authorized to submit applications on behalf of the organization' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  scopeDescription!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({
    enum: RepresentativeAuthorityStatus,
    default: RepresentativeAuthorityStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RepresentativeAuthorityStatus)
  status?: RepresentativeAuthorityStatus;
}
