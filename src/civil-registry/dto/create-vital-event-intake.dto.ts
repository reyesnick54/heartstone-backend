import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VitalEventType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVitalEventIntakeDto {
  @ApiProperty({ enum: VitalEventType })
  @IsEnum(VitalEventType)
  eventType!: VitalEventType;

  @ApiProperty()
  @IsUUID()
  jurisdictionId!: string;

  @ApiProperty()
  @IsUUID()
  institutionId!: string;

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
  governmentServiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governingServicePackVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primarySubjectCivilPersonRecordId?: string;
}
