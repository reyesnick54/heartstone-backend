import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityOfficeholderLinkStatus } from '@prisma/client';

export class OfficeholderLinkResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  officeholderId!: string;

  @ApiProperty({ enum: IdentityOfficeholderLinkStatus })
  status!: IdentityOfficeholderLinkStatus;

  @ApiProperty()
  linkedAt!: Date;

  @ApiPropertyOptional()
  linkedByIdentityId?: string | null;

  @ApiPropertyOptional()
  revokedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
