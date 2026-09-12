import { DocumentPrivacyClassification, DocumentSecurityClassification } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UploadDocumentVersionDto {
  @IsString()
  contentBase64!: string;

  @IsString()
  @MaxLength(500)
  originalFilename!: string;

  @IsString()
  @MaxLength(200)
  contentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @IsOptional()
  @IsEnum(DocumentSecurityClassification)
  securityClassification?: DocumentSecurityClassification;

  @IsOptional()
  @IsEnum(DocumentPrivacyClassification)
  privacyClassification?: DocumentPrivacyClassification;

  @IsOptional()
  @IsUUID()
  receivedFromExternalAuthorityId?: string;
}
