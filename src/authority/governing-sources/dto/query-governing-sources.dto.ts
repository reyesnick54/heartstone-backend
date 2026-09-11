import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  GoverningSourceStatus,
  GoverningSourceType,
  SourceAuthenticationStatus,
} from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryGoverningSourcesDto {
  @ApiPropertyOptional({ enum: GoverningSourceStatus })
  @IsOptional()
  @IsEnum(GoverningSourceStatus)
  sourceStatus?: GoverningSourceStatus;

  @ApiPropertyOptional({ enum: SourceAuthenticationStatus })
  @IsOptional()
  @IsEnum(SourceAuthenticationStatus)
  authenticationStatus?: SourceAuthenticationStatus;

  @ApiPropertyOptional({ enum: GoverningSourceType })
  @IsOptional()
  @IsEnum(GoverningSourceType)
  sourceType?: GoverningSourceType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;
}
