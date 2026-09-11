import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGovernmentServiceVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  coveredActivities?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  excludedActivities?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  geographicScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  publicDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  typicalValidityDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  informationLastVerifiedAt?: Date;

  @ApiPropertyOptional({ enum: ApplicantCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ApplicantCategory, { each: true })
  applicantCategories?: ApplicantCategory[];
}
