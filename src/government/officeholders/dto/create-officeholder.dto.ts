import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOfficeholderDto {
  @ApiProperty({ example: 'CODE-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Example name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiProperty({ example: 'OH-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  referenceCode!: string;

  @ApiProperty({ example: 'Jane Q. Public' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName!: string;

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

  @ApiPropertyOptional({
    enum: StructuralLifecycleStatus,
    default: StructuralLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
