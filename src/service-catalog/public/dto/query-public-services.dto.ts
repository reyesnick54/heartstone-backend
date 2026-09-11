import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicantCategory,
  CatalogServiceType,
  GovernmentServicePublicAvailability,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryPublicServicesDto {
  @ApiPropertyOptional({ description: 'Filter by service family code' })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiPropertyOptional({ enum: ApplicantCategory })
  @IsOptional()
  @IsEnum(ApplicantCategory)
  applicantCategory?: ApplicantCategory;

  @ApiPropertyOptional({
    description: 'Keyword search across public name, purpose, and activities',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    enum: GovernmentServicePublicAvailability,
    description: 'Filter by public availability status',
  })
  @IsOptional()
  @IsEnum(GovernmentServicePublicAvailability)
  status?: GovernmentServicePublicAvailability;

  @ApiPropertyOptional({ description: 'Filter by responsible department id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ enum: CatalogServiceType })
  @IsOptional()
  @IsEnum(CatalogServiceType)
  serviceType?: CatalogServiceType;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
