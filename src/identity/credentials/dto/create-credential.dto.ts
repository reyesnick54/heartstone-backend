import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialStatus, CredentialType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCredentialDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  identityId!: string;

  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  type!: CredentialType;

  @ApiPropertyOptional({
    description: 'Plaintext password — hashed before storage, never persisted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;

  @ApiPropertyOptional({ enum: CredentialStatus, default: CredentialStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CredentialStatus)
  status?: CredentialStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcSubject?: string;
}
