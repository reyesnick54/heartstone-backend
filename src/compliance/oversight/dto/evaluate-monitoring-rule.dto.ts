import { Prisma } from '@prisma/client';
import { IsArray, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class EvaluateMonitoringRuleDto {
  @IsUUID()
  ruleId!: string;

  @IsUUID()
  projectionId!: string;

  @IsArray()
  sourceDataRefs!: Prisma.InputJsonValue;

  @IsOptional()
  @IsInt()
  @Min(0)
  countValue?: number;
}
