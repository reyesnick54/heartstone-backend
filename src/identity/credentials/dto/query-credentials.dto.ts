import { ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialStatus, CredentialType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryCredentialsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  identityId?: string;

  @ApiPropertyOptional({ enum: CredentialType })
  @IsOptional()
  @IsEnum(CredentialType)
  type?: CredentialType;

  @ApiPropertyOptional({ enum: CredentialStatus })
  @IsOptional()
  @IsEnum(CredentialStatus)
  status?: CredentialStatus;
}
