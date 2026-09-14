import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatusProjectionAudience } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class DeriveProjectStatusProjectionDto {
  @ApiProperty({ enum: ProjectStatusProjectionAudience })
  @IsEnum(ProjectStatusProjectionAudience)
  audience!: ProjectStatusProjectionAudience;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  evidenceCutoffAt?: string;
}
