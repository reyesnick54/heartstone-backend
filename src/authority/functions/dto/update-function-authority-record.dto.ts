import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityClassification,
  AuthorityLifecycleState,
  ControlledFunctionClass,
} from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateFunctionAuthorityRecordDto {
  @ApiPropertyOptional({ example: 'License Eligibility Screening' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated screening scope.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: ControlledFunctionClass })
  @IsOptional()
  @IsEnum(ControlledFunctionClass)
  functionClass?: ControlledFunctionClass;

  @ApiPropertyOptional({ enum: AuthorityClassification })
  @IsOptional()
  @IsEnum(AuthorityClassification)
  authorityClassification?: AuthorityClassification;

  @ApiPropertyOptional({ enum: AuthorityLifecycleState })
  @IsOptional()
  @IsEnum(AuthorityLifecycleState)
  lifecycleState?: AuthorityLifecycleState;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  revalidationAt?: string | null;
}
