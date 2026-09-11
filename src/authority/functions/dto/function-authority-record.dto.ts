import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityClassification,
  AuthorityLifecycleState,
  ControlledFunctionClass,
} from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryFunctionAuthorityRecordsDto {
  @ApiPropertyOptional({ enum: AuthorityLifecycleState })
  @IsOptional()
  @IsEnum(AuthorityLifecycleState)
  lifecycleState?: AuthorityLifecycleState;

  @ApiPropertyOptional({ enum: AuthorityClassification })
  @IsOptional()
  @IsEnum(AuthorityClassification)
  authorityClassification?: AuthorityClassification;

  @ApiPropertyOptional({ enum: ControlledFunctionClass })
  @IsOptional()
  @IsEnum(ControlledFunctionClass)
  functionClass?: ControlledFunctionClass;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class FunctionAuthorityRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: ControlledFunctionClass })
  functionClass!: ControlledFunctionClass;

  @ApiProperty({ enum: AuthorityClassification })
  authorityClassification!: AuthorityClassification;

  @ApiProperty({ enum: AuthorityLifecycleState })
  lifecycleState!: AuthorityLifecycleState;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  departmentId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  effectiveFrom?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  effectiveUntil?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  revalidationAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
