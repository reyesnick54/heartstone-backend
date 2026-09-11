import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialStatus, CredentialType } from '@prisma/client';

export class CredentialResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty({ enum: CredentialType })
  type!: CredentialType;

  @ApiProperty({ enum: CredentialStatus })
  status!: CredentialStatus;

  @ApiPropertyOptional()
  oidcProvider?: string | null;

  @ApiPropertyOptional()
  oidcSubject?: string | null;

  @ApiPropertyOptional()
  revokedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
