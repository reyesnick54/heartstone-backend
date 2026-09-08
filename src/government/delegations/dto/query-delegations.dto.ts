import { ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryDelegationsDto {
  @ApiPropertyOptional({ enum: DelegationStatus })
  @IsOptional()
  @IsEnum(DelegationStatus)
  status?: DelegationStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}
