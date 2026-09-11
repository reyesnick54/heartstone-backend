import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoverningSourceStatus } from '@prisma/client';

export class GoverningSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  versionLabel!: string;

  @ApiProperty({ enum: GoverningSourceStatus })
  status!: GoverningSourceStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil!: Date | null;

  @ApiProperty()
  contentHash!: string;

  @ApiPropertyOptional()
  authenticatedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
