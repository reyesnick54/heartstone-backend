import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

import { AssessIssuanceReadinessDto } from './assess-issuance-readiness.dto';

export class IssueOfficialInstrumentDto extends AssessIssuanceReadinessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  controlledFields?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  computedFields?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  freeFormFields?: Record<string, unknown>;
}
