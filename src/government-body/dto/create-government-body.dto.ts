import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { GovernmentBodyType } from '../../common/enums/government-body-type.enum';
import { RecordStatus } from '../../common/enums/record-status.enum';

export class CreateGovernmentBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  institutionId!: string;

  @ApiProperty({ example: 'BOARD-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Governing Board' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: GovernmentBodyType })
  @IsEnum(GovernmentBodyType)
  type!: GovernmentBodyType;

  @ApiPropertyOptional({ enum: RecordStatus, default: RecordStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
