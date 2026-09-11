import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { ApplicantFactsDto } from './applicant-facts.dto';

export class EligibilityCheckRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantFactsDto)
  facts?: ApplicantFactsDto;

  @ApiPropertyOptional({
    description: 'Optional specific version; defaults to current published version',
  })
  @IsOptional()
  @IsUUID()
  versionId?: string;
}
