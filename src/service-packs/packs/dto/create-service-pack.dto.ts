import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateServicePackDto {
  @ApiProperty({ example: 'immigration-services-pack' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  code!: string;

  @ApiProperty({ example: 'Immigration Services Pack' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  institutionId!: string;
}
