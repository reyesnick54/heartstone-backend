import { DocumentSourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDocumentRecordDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(200)
  documentType!: string;

  @IsEnum(DocumentSourceType)
  sourceType!: DocumentSourceType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  authorOrIssuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recipient?: string;

  @IsOptional()
  @IsUUID()
  owningInstitutionId?: string;

  @IsOptional()
  @IsUUID()
  owningOrganizationId?: string;
}
