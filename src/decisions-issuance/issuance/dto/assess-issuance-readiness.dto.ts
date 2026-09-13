import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstrumentIssuerSource } from '@prisma/client';
import { IsDateString, IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';

export class AssessIssuanceReadinessDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  governmentDecisionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  instrumentTypeVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  caseId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  issuerOfficeholderId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  issuerOfficeId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  issuerAppointmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  issuerDelegationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  holderIdentityId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  holderOrganizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  signatureDocumentVersionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sealDocumentVersionId?: string;

  @ApiPropertyOptional({ enum: InstrumentIssuerSource })
  @IsOptional()
  @IsEnum(InstrumentIssuerSource)
  issuerSource?: InstrumentIssuerSource;

  @ApiPropertyOptional()
  @IsOptional()
  externalIssuerReference?: string;
}
