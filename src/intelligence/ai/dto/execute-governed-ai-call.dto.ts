import { AiGovernedDataClass } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AiCallSourceReferenceDto {
  @IsString()
  @MaxLength(128)
  sourceType!: string;

  @IsString()
  @MaxLength(256)
  sourceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  sourceLabel?: string;
}

export class ExecuteGovernedAiCallDto {
  @IsUUID()
  agentDefinitionId!: string;

  @IsUUID()
  institutionId!: string;

  @IsUUID()
  modelVersionId!: string;

  @IsString()
  @MaxLength(512)
  purpose!: string;

  @IsString()
  @MaxLength(32000)
  instructions!: string;

  @IsEnum(AiGovernedDataClass)
  dataClassification!: AiGovernedDataClass;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestedToolCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiCallSourceReferenceDto)
  sourceReferences?: AiCallSourceReferenceDto[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  correlationId?: string;
}
