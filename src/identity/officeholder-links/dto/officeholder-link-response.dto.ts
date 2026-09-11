import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IdentityOfficeholderLink,
  IdentityOfficeholderLinkStatus,
  IdentityOfficeholderVerificationMethod,
} from '@prisma/client';

import { isIdentityOfficeholderLinkActive } from '../../common/is-active-link.util';
import { IdentityOfficeholderLinkStatus } from '@prisma/client';

export class OfficeholderLinkResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  personId!: string;

  @ApiPropertyOptional()
  userAccountId?: string | null;
  identityId!: string;

  @ApiProperty()
  officeholderId!: string;

  @ApiProperty({ enum: IdentityOfficeholderLinkStatus })
  status!: IdentityOfficeholderLinkStatus;

  @ApiPropertyOptional({ enum: IdentityOfficeholderVerificationMethod })
  verificationMethod?: IdentityOfficeholderVerificationMethod | null;

  @ApiPropertyOptional()
  evidenceReference?: string | null;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty()
  isCurrent!: boolean;
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

  static fromEntity(
    link: IdentityOfficeholderLink,
    at: Date = new Date(),
  ): OfficeholderLinkResponseDto {
    return {
      id: link.id,
      personId: link.personId,
      userAccountId: link.userAccountId,
      officeholderId: link.officeholderId,
      status: link.status,
      verificationMethod: link.verificationMethod,
      evidenceReference: link.evidenceReference,
      effectiveFrom: link.effectiveFrom,
      effectiveUntil: link.effectiveUntil,
      isCurrent: isIdentityOfficeholderLinkActive(link, at),
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }
}
