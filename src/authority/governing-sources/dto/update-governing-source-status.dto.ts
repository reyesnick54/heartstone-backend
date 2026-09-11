import { ApiProperty } from '@nestjs/swagger';
import { GoverningSourceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateGoverningSourceStatusDto {
  @ApiProperty({ enum: GoverningSourceStatus })
  @IsEnum(GoverningSourceStatus)
  sourceStatus!: GoverningSourceStatus;
}
