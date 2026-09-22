import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class SubmitCorrectionRequestDto {
  @ApiProperty()
  @IsUUID()
  subjectCivilPersonRecordId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  civilRegistryEntryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiProperty()
  @IsObject()
  requestedChanges!: Record<string, unknown>;
}
