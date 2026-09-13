import {
  DocumentConfidentialityOrPrivilegeStatus,
  DocumentPrivacyClassification,
  DocumentSecurityClassification,
} from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateClassificationDto {
  @IsOptional()
  @IsEnum(DocumentSecurityClassification)
  securityClassification?: DocumentSecurityClassification;

  @IsOptional()
  @IsEnum(DocumentPrivacyClassification)
  privacyClassification?: DocumentPrivacyClassification;

  @IsOptional()
  @IsEnum(DocumentConfidentialityOrPrivilegeStatus)
  confidentialityOrPrivilegeStatus?: DocumentConfidentialityOrPrivilegeStatus;
}
