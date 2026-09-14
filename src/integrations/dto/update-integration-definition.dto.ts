import { ApiPropertyOptional } from '@nestjs/swagger';
import { TechnologyDependencyCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateIntegrationDefinitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  officialName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionalOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  systemOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  provider?: string;

  @ApiPropertyOptional({ enum: TechnologyDependencyCategory })
  @IsOptional()
  @IsEnum(TechnologyDependencyCategory)
  dependencyCategory?: TechnologyDependencyCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  businessPurpose?: string;
}
