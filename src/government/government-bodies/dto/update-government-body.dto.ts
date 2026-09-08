import { ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentBodyType, StructuralLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGovernmentBodyDto {
  @ApiPropertyOptional({ enum: GovernmentBodyType })
  @IsOptional()
  @IsEnum(GovernmentBodyType)
  type?: GovernmentBodyType;

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

  @ApiPropertyOptional({ enum: StructuralLifecycleStatus })
  @IsOptional()
  @IsEnum(StructuralLifecycleStatus)
  status?: StructuralLifecycleStatus;
}
