import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ExecuteDispositionDto {
  @ApiProperty()
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  officeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  executionNotes?: string;
}
