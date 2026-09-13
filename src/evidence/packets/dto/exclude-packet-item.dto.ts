import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class ExcludePacketItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  evidenceRecordId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  exclusionReason!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  authorizedByOfficeholderId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  authorityEvaluationRecordId?: string;
}
