import { ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOfficeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOfficeDto {
  @ApiPropertyOptional({ example: 'Director of Business Licensing' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: StructuralLifecycleStatus })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
