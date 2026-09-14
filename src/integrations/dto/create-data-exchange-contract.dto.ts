import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDataExchangeContractDto {
  @ApiProperty()
  @IsUUID()
  integrationVersionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  schemaIdentifier!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  schemaVersion!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  classification!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  purpose!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  minimumNecessaryRule!: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  validationRules?: unknown[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  transformationRules?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  retention?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  loggingRestrictions?: string;
}
