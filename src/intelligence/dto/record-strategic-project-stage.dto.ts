import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrategicProjectLifecycleStage } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RecordStrategicProjectStageDto {
  @ApiProperty({ enum: StrategicProjectLifecycleStage })
  @IsEnum(StrategicProjectLifecycleStage)
  stage!: StrategicProjectLifecycleStage;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  institutionalStateReference!: string;

  @ApiProperty()
  @IsISO8601()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceRecordType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceRecordId?: string;
}
