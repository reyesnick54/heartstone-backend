import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  feeAssessmentId!: string;

  @ApiProperty()
  @IsUUID()
  institutionId!: string;

  @ApiProperty()
  @IsUUID()
  payerIdentityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  masterAdministrativeFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;
}
