import {
  ExternalAuthorityBindingClass,
  ExternalDeterminationAuthenticityStatus,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class RecordExternalDeterminationDto {
  @IsString()
  @MinLength(1)
  sourceAuthority!: string;

  @IsString()
  @MinLength(1)
  outcomeText!: string;

  @IsISO8601()
  receivedDate!: string;

  @IsOptional()
  @IsString()
  officialReference?: string;

  @IsOptional()
  @IsISO8601()
  decisionDate?: string;

  @IsOptional()
  @IsString()
  reasonsReference?: string;

  @IsOptional()
  @IsISO8601()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  stayInterimEffect?: string;

  @IsOptional()
  @IsString()
  remedyText?: string;

  @IsOptional()
  @IsString()
  furtherRightsText?: string;

  @IsOptional()
  @IsString()
  instrumentOrderReference?: string;

  @IsOptional()
  @IsString()
  conditionsText?: string;

  @IsOptional()
  @IsString()
  implementationRequirements?: string;

  @IsOptional()
  @IsString()
  verificationMethod?: string;

  @IsOptional()
  @IsEnum(ExternalAuthorityBindingClass)
  bindingClass?: ExternalAuthorityBindingClass;

  @IsOptional()
  @IsEnum(ExternalDeterminationAuthenticityStatus)
  authenticityStatus?: ExternalDeterminationAuthenticityStatus;

  @IsOptional()
  @IsString()
  authenticityVerificationRef?: string;

  @IsOptional()
  @IsBoolean()
  isAuthenticated?: boolean;
}
