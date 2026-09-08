import { ApiPropertyOptional } from '@nestjs/swagger';
import { JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryJurisdictionsDto {
  @ApiPropertyOptional({ enum: StructuralLifecycleStatus })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;

  @ApiPropertyOptional({ enum: JurisdictionType })
  @IsOptional()
  @IsEnum(JurisdictionType)
  type?: JurisdictionType;
}
