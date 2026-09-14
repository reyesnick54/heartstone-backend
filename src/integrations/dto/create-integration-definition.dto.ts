import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TechnologyDependencyCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateIntegrationDefinitionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  integrationCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  officialName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsUUID()
  institutionalOwnerId!: string;

  @ApiProperty({ description: 'Technical/system ownership identifier — not institutional authority' })
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  systemOwner!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  provider!: string;

  @ApiProperty({ enum: TechnologyDependencyCategory })
  @IsEnum(TechnologyDependencyCategory)
  dependencyCategory!: TechnologyDependencyCategory;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  businessPurpose!: string;
}
