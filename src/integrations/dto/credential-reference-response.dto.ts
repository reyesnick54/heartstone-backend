import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialRotationStatus } from '@prisma/client';

export class CredentialReferenceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  integrationVersionId!: string;

  @ApiProperty()
  credentialType!: string;

  @ApiPropertyOptional()
  serviceIdentity?: string | null;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  expiration?: Date | null;

  @ApiProperty({ enum: CredentialRotationStatus })
  rotationStatus!: CredentialRotationStatus;

  @ApiProperty({ description: 'Whether a secret reference is configured (value not exposed)' })
  secretReferenceConfigured!: boolean;

  @ApiProperty({ description: 'Whether a certificate reference is configured (value not exposed)' })
  certificateReferenceConfigured!: boolean;

  @ApiProperty({ description: 'Whether the credential reference has expired' })
  isExpired!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
