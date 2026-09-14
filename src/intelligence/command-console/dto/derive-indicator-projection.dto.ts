import {
  DashboardDataQuality,
  DashboardDrilldownReferenceType,
  DashboardSourceAvailability,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class DrilldownReferenceDto {
  @IsEnum(DashboardDrilldownReferenceType)
  referenceType!: DashboardDrilldownReferenceType;

  @IsUUID()
  referenceId!: string;

  @IsString()
  referenceLabel!: string;

  @IsOptional()
  @IsUUID()
  evidencePacketId?: string;

  @IsString()
  sourceStatus!: string;

  @IsString()
  ownerReference!: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  lastRefresh?: string;

  @IsOptional()
  @IsDateString()
  revalidationDate?: string;

  @IsOptional()
  @IsString()
  limitations?: string;
}

export class DeriveIndicatorProjectionDto {
  @IsUUID()
  indicatorDefinitionId!: string;

  @IsUUID()
  dashboardVersionId!: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsInt()
  @Min(0)
  countValue!: number;

  @IsOptional()
  @IsNumber()
  scoreValue?: number;

  @IsEnum(DashboardDataQuality)
  dataQuality!: DashboardDataQuality;

  @IsOptional()
  @IsDateString()
  calculatedAt?: string;

  @IsOptional()
  @IsDateString()
  sourceFreshness?: string;

  @IsOptional()
  @IsDateString()
  staleAfter?: string;

  @IsOptional()
  @IsEnum(DashboardSourceAvailability)
  sourceAvailability?: DashboardSourceAvailability;

  @IsOptional()
  @IsString()
  limitations?: string;

  @IsOptional()
  @IsUUID()
  ownerIdentityId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrilldownReferenceDto)
  drilldowns!: DrilldownReferenceDto[];
}
