import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalAuthorityType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryExternalAuthoritiesDto {
  @ApiPropertyOptional({ enum: StructuralLifecycleStatus })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;

  @ApiPropertyOptional({ enum: ExternalAuthorityType })
  @IsOptional()
  @IsEnum(ExternalAuthorityType)
  type?: ExternalAuthorityType;
}
