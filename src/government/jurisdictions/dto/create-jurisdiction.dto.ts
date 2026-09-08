import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJurisdictionDto {
  @ApiProperty({ example: 'US-FED' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'United States Federal Government' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'National jurisdiction for federal institutions.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: JurisdictionType, example: JurisdictionType.NATIONAL })
  @IsEnum(JurisdictionType)
  type!: JurisdictionType;

  @ApiPropertyOptional({
    enum: StructuralLifecycleStatus,
    default: StructuralLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
