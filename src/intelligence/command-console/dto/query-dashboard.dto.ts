import {
  DashboardAccessPurpose,
  DashboardFilterDimension,
  DashboardSensitivityLevel,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryDashboardDto {
  @IsUUID()
  identityId!: string;

  @IsUUID()
  dashboardDefinitionId!: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsEnum(DashboardAccessPurpose)
  purpose!: DashboardAccessPurpose;

  @IsEnum(DashboardSensitivityLevel)
  sensitivityScope!: DashboardSensitivityLevel;

  @IsOptional()
  @IsBoolean()
  technicalPermissionOnly?: boolean;

  @IsOptional()
  @IsString()
  securityClearanceLevel?: string;

  @IsOptional()
  @IsUUID()
  caseAssignmentId?: string;

  @IsOptional()
  @IsObject()
  filters?: Partial<Record<DashboardFilterDimension, string>>;
}
