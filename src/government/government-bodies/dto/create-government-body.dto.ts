import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentBodyType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateGovernmentBodyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  institutionId!: string;

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

  @ApiProperty({ enum: GovernmentBodyType })
  @IsEnum(GovernmentBodyType)
  type!: GovernmentBodyType;

  @ApiPropertyOptional({
    enum: StructuralLifecycleStatus,
    default: StructuralLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
