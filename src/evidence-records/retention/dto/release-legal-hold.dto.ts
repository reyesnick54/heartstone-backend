import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ReleaseLegalHoldDto {
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
}
