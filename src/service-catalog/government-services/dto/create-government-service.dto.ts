import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentServiceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateGovernmentServiceDto {
  @ApiProperty({ example: 'BUSINESS-LICENSE' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty({ example: 'Business License Application' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ enum: GovernmentServiceStatus })
  @IsOptional()
  @IsEnum(GovernmentServiceStatus)
  status?: GovernmentServiceStatus;
}
