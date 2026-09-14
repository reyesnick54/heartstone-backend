import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceReviewStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class FinalizeComplianceReviewDto {
  @ApiProperty()
  @IsUUID()
  reviewId!: string;

  @ApiProperty({ enum: ComplianceReviewStatus })
  @IsEnum(ComplianceReviewStatus)
  status!: ComplianceReviewStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewerOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  findings?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  unresolvedIssues?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deficiencySummary?: string;
}
