import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GoverningSourceStatus,
  GoverningSourceType,
  Prisma,
  SourceAuthenticationStatus,
} from '@prisma/client';

export class GoverningSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sourceCode!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: GoverningSourceType })
  sourceType!: GoverningSourceType;

  @ApiPropertyOptional()
  issuer?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  jurisdictionId?: string | null;

  @ApiPropertyOptional()
  instrumentDate?: Date | null;

  @ApiPropertyOptional()
  effectiveDate?: Date | null;

  @ApiPropertyOptional()
  commencementDate?: Date | null;

  @ApiPropertyOptional()
  expiryDate?: Date | null;

  @ApiProperty({ enum: SourceAuthenticationStatus })
  authenticationStatus!: SourceAuthenticationStatus;

  @ApiProperty({ enum: GoverningSourceStatus })
  sourceStatus!: GoverningSourceStatus;

  @ApiPropertyOptional()
  officialLocationRef?: string | null;

  @ApiPropertyOptional()
  documentFingerprint?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  classificationMetadata?: Prisma.JsonValue | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
