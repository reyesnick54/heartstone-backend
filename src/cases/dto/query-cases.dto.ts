import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryCasesDto {
  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus)
  caseStatus?: CaseStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleDepartmentId?: string;
}
