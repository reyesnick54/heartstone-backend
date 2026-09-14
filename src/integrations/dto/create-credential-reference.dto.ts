import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialRotationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCredentialReferenceDto {
  @ApiProperty()
  @IsUUID()
  integrationVersionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  credentialType!: string;

  @ApiPropertyOptional({ description: 'Secret vault reference — never returned in API responses' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  secretReference?: string;

  @ApiPropertyOptional({ description: 'Certificate vault reference — never returned in API responses' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  certificateReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  serviceIdentity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiration?: string;

  @ApiPropertyOptional({ enum: CredentialRotationStatus })
  @IsOptional()
  @IsEnum(CredentialRotationStatus)
  rotationStatus?: CredentialRotationStatus;
}
