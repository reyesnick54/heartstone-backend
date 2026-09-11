import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class RepresentativeContextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identityId?: string;
}

export class ApplicantFactsDto {
  @ApiPropertyOptional({ example: 'INDIVIDUAL' })
  @IsOptional()
  @IsString()
  applicantCategory?: string;

  @ApiPropertyOptional({ example: 'CORPORATION' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: 'RESIDENT' })
  @IsOptional()
  @IsString()
  residencyStatus?: string;

  @ApiPropertyOptional({ example: 'RETAIL' })
  @IsOptional()
  @IsString()
  activity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  geographicScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ownershipAttributes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employerStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  prerequisiteStatuses?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RepresentativeContextDto)
  representativeContext?: RepresentativeContextDto;
}
