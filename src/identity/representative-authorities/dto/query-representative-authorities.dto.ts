import { ApiPropertyOptional } from '@nestjs/swagger';
import { RepresentativeAuthorityStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryRepresentativeAuthoritiesDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  identityId?: string;

  @ApiPropertyOptional({ enum: RepresentativeAuthorityStatus })
  @IsOptional()
  @IsEnum(RepresentativeAuthorityStatus)
  status?: RepresentativeAuthorityStatus;
}
