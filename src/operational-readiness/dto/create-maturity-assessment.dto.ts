import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityMaturityState } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMaturityAssessmentDto {
  @ApiProperty()
  @IsUUID()
  capabilityDefinitionId!: string;

  @ApiProperty()
  @IsUUID()
  capabilityVersionId!: string;

  @ApiProperty({ enum: CapabilityMaturityState })
  @IsEnum(CapabilityMaturityState)
  requestedMaturity!: CapabilityMaturityState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usersPopulation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorityBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionalOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicalOwnerIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  evidence?: { type: string; reference: string }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTechnicalAdministrator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsInstitutionalRisk?: boolean;
}
