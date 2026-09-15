import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCapabilityVersionDto {
  @ApiProperty()
  @IsUUID()
  capabilityDefinitionId!: string;

  @ApiProperty()
  @IsString()
  versionNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  setAsCurrent?: boolean;
}
