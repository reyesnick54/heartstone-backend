import { ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOfficeholderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOfficeholderDto {
  @ApiPropertyOptional({ example: 'Jane Q. Public' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  givenName?: string;

  @ApiPropertyOptional({ example: 'Public' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  familyName?: string;

  @ApiPropertyOptional({ example: 'Dr.' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  titlePrefix?: string;

  @ApiPropertyOptional({ example: 'PhD' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  titleSuffix?: string;

  @ApiPropertyOptional({ enum: StructuralLifecycleStatus })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
