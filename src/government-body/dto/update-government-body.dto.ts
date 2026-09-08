import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { GovernmentBodyType } from '../../common/enums/government-body-type.enum';
import { RecordStatus } from '../../common/enums/record-status.enum';

export class UpdateGovernmentBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: GovernmentBodyType })
  @IsOptional()
  @IsEnum(GovernmentBodyType)
  type?: GovernmentBodyType;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
