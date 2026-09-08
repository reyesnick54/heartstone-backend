import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalAuthorityType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExternalAuthorityDto {
  @ApiProperty({ example: 'EU-COMMISSION' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'European Commission' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Supranational executive institution' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: ExternalAuthorityType, example: ExternalAuthorityType.INTERNATIONAL_BODY })
  @IsEnum(ExternalAuthorityType)
  type!: ExternalAuthorityType;

  @ApiPropertyOptional({ example: 'European Union' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  jurisdictionDescription?: string;
}
