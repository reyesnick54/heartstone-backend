import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CaptureSnapshotDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dashboardVersionId!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  projectionIds!: string[];
}
