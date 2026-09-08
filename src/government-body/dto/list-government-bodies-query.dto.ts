import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { GovernmentBodyType } from '../../common/enums/government-body-type.enum';
import { RecordStatus } from '../../common/enums/record-status.enum';

export class ListGovernmentBodiesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiPropertyOptional({ enum: GovernmentBodyType })
  @IsOptional()
  @IsEnum(GovernmentBodyType)
  type?: GovernmentBodyType;
}
