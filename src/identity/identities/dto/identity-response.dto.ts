import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';

export class IdentityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: IdentityType })
  type!: IdentityType;

  @ApiPropertyOptional()
  userAccountId?: string | null;

  @ApiPropertyOptional()
  personId?: string | null;

  @ApiPropertyOptional()
  organizationId?: string | null;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
