import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalAuthorityType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExternalAuthorityDto {
  @ApiProperty({ example: 'EPA-US' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'United States Environmental Protection Agency' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: ExternalAuthorityType })
  @IsEnum(ExternalAuthorityType)
  type!: ExternalAuthorityType;

  @ApiPropertyOptional({
    enum: StructuralLifecycleStatus,
    default: StructuralLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
