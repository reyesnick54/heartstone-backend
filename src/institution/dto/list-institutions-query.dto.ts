import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { RecordStatus } from '../../common/enums/record-status.enum';

export class ListInstitutionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jurisdictionId?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
