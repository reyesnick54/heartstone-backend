import { SecurityEnvironment, SecurityTestCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordSecurityTestExecutionDto {
  @IsOptional()
  @IsString()
  executionNumber?: string;

  @IsEnum(SecurityTestCategory)
  category!: SecurityTestCategory;

  @IsEnum(SecurityEnvironment)
  environment!: SecurityEnvironment;

  @IsUUID()
  executorIdentityId!: string;

  @IsString()
  targetReference!: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  findingsSummary?: string;
}
