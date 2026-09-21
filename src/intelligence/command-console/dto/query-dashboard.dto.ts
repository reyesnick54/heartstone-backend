import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DashboardAccessPurpose,
  DashboardFilterDimension,
  DashboardSensitivityLevel,
} from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryDashboardDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dashboardDefinitionId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Requested institution filter only; access is verified against authenticated actor entitlements',
  })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Requested department filter only; access is verified against authenticated actor entitlements',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ enum: DashboardAccessPurpose })
  @IsEnum(DashboardAccessPurpose)
  purpose!: DashboardAccessPurpose;

  @ApiProperty({ enum: DashboardSensitivityLevel })
  @IsEnum(DashboardSensitivityLevel)
  sensitivityScope!: DashboardSensitivityLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  securityClearanceLevel?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  caseAssignmentId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  filters?: Partial<Record<DashboardFilterDimension, string>>;
}
