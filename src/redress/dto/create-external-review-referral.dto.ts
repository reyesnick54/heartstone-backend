import {
  ExternalReviewRouteType,
  ExternalReviewTransmissionMethod,
  RetainedAppealAuthorityClass,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateExternalReviewReferralDto {
  @IsUUID()
  redressMatterId!: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsEnum(ExternalReviewRouteType)
  routeType!: ExternalReviewRouteType;

  @IsString()
  @MinLength(1)
  competentAuthority!: string;

  @IsOptional()
  @IsUUID()
  externalAuthorityId?: string;

  @IsString()
  @MinLength(1)
  routeVersion!: string;

  @IsString()
  @MinLength(1)
  authorityPurpose!: string;

  @IsOptional()
  @IsString()
  standingRecordReference?: string;

  @IsOptional()
  @IsString()
  timelinessRecordReference?: string;

  @IsOptional()
  @IsUUID()
  challengedDecisionId?: string;

  @IsOptional()
  @IsUUID()
  challengedInstrumentId?: string;

  @IsString()
  @MinLength(1)
  grounds!: string;

  @IsOptional()
  @IsString()
  requestedRemedy?: string;

  @IsString()
  @MinLength(1)
  securityClassification!: string;

  @IsOptional()
  @IsEnum(ExternalReviewTransmissionMethod)
  transmissionMethod?: ExternalReviewTransmissionMethod;

  @IsOptional()
  @IsEnum(RetainedAppealAuthorityClass)
  retainedAuthorityClass?: RetainedAppealAuthorityClass;
}
