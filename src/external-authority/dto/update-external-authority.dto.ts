import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalAuthorityType, RecordStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateExternalAuthorityDto {
  @ApiPropertyOptional({ example: 'European Commission' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Supranational executive institution' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ExternalAuthorityType })
  @IsOptional()
  @IsEnum(ExternalAuthorityType)
  type?: ExternalAuthorityType;

  @ApiPropertyOptional({ example: 'European Union' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  jurisdictionDescription?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
