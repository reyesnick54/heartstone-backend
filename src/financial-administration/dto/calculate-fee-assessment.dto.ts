import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CalculateFeeAssessmentDto {
  @ApiProperty()
  @IsUUID()
  feeScheduleVersionId!: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  officialInstrumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  complianceMatterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  redressMatterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  masterAdministrativeFileId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  feeCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  quantities?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  calculationInputs?: Record<string, unknown>;
}
