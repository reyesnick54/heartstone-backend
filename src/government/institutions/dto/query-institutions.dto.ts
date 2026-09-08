import { ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryInstitutionsDto {
  @ApiPropertyOptional({ enum: StructuralLifecycleStatus })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;

  @ApiPropertyOptional({ enum: InstitutionType })
  @IsOptional()
  @IsEnum(InstitutionType)
  type?: InstitutionType;
}
