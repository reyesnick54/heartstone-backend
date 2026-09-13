import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class PrepareDecisionNoticeDto {
  @ApiProperty()
  @IsString()
  decisionSummary!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  materialRequirementsNotSatisfied?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conditionsSummary?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  correctionOpportunity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reviewOrAppealRightsSummary?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  filingMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  filingDeadline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  competentReviewer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  effectOfFiling?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  confidentialityRedactions?: Record<string, unknown>[];
}
