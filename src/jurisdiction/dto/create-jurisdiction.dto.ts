import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { RecordStatus } from '../../common/enums/record-status.enum';

export class CreateJurisdictionDto {
  @ApiProperty({ example: 'US-FED' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'United States Federal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: RecordStatus, default: RecordStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
