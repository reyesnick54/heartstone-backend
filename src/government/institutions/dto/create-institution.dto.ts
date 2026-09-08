import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInstitutionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jurisdictionId!: string;

  @ApiProperty({ example: 'DOT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Department of Transportation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Federal transportation agency.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: InstitutionType, example: InstitutionType.AGENCY })
  @IsEnum(InstitutionType)
  type!: InstitutionType;

  @ApiPropertyOptional({
    enum: StructuralLifecycleStatus,
    default: StructuralLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
