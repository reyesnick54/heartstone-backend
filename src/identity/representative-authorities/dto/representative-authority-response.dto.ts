import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepresentativeAuthorityStatus } from '@prisma/client';

export class RepresentativeAuthorityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  scopeDescription!: string;

  @ApiProperty({ enum: RepresentativeAuthorityStatus })
  status!: RepresentativeAuthorityStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
