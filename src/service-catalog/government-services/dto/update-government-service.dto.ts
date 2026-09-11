import { ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentServiceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateGovernmentServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: GovernmentServiceStatus })
  @IsOptional()
  @IsEnum(GovernmentServiceStatus)
  status?: GovernmentServiceStatus;
}
