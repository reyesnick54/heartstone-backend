import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthoritativeSourceStatus,
  FieldAuthorityConflictBehavior,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFieldAuthorityMappingDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  field!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  source!: string;

  @ApiPropertyOptional({ enum: AuthoritativeSourceStatus })
  @IsOptional()
  @IsEnum(AuthoritativeSourceStatus)
  sourceStatus?: AuthoritativeSourceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  validity?: string;

  @ApiPropertyOptional({ enum: FieldAuthorityConflictBehavior })
  @IsOptional()
  @IsEnum(FieldAuthorityConflictBehavior)
  conflictBehavior?: FieldAuthorityConflictBehavior;
}
