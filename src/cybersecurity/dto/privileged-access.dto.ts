import { SecurityEnvironment } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePrivilegedAccessReviewDto {
  @IsOptional()
  @IsString()
  reviewNumber?: string;

  @IsUUID()
  subjectIdentityId!: string;

  @IsUUID()
  reviewerIdentityId!: string;

  @IsEnum(SecurityEnvironment)
  environment!: SecurityEnvironment;

  @IsString()
  accessPurpose!: string;

  @IsString()
  approvedScope!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  accessGrantedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  accessExpiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  isSharedAdministratorAccount?: boolean;
}

export class CreateBreakGlassAccessEventDto {
  @IsOptional()
  @IsString()
  eventNumber?: string;

  @IsUUID()
  actorIdentityId!: string;

  @IsOptional()
  @IsUUID()
  approverIdentityId?: string;

  @IsString()
  reason!: string;

  @IsString()
  approvedScope!: string;

  @IsEnum(SecurityEnvironment)
  environment!: SecurityEnvironment;

  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;

  @IsOptional()
  @IsString()
  enhancedLoggingReference?: string;
}

export class ActivateBreakGlassAccessDto {
  @IsUUID()
  approverIdentityId!: string;

  @IsString()
  enhancedLoggingReference!: string;
}

export class CreateServiceIdentityReviewDto {
  @IsOptional()
  @IsString()
  reviewNumber?: string;

  @IsUUID()
  serviceIdentityId!: string;

  @IsUUID()
  reviewerIdentityId!: string;

  @IsString()
  identityCategory!: string;

  @IsOptional()
  @IsBoolean()
  isAnonymousOrShared?: boolean;

  @IsOptional()
  @IsBoolean()
  isConsequentialEnvironment?: boolean;

  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;
}

export class CreateCredentialRotationRecordDto {
  @IsOptional()
  @IsString()
  rotationNumber?: string;

  @IsUUID()
  credentialId!: string;

  @IsUUID()
  ownerIdentityId!: string;

  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @IsString()
  secretManagerReference!: string;

  @IsOptional()
  @IsBoolean()
  previousReferenceRetained?: boolean;
}
