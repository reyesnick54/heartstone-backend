import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TechnologyDependencyCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTechnologyDependencyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: TechnologyDependencyCategory })
  @IsEnum(TechnologyDependencyCategory)
  category!: TechnologyDependencyCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  versionLabel?: string;
}
