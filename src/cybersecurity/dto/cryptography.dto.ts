import { CryptographicMigrationStatus, PostQuantumMigrationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCryptographicKeyReferenceDto {
  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsString()
  secretManagerReference!: string;

  @IsString()
  algorithm!: string;

  @IsString()
  keyPurpose!: string;

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  rotationScheduleDays?: number;
}

export class CreateCertificateReferenceDto {
  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsString()
  secretManagerReference!: string;

  @IsString()
  subject!: string;

  @IsString()
  issuer!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;
}

export class CreateCryptographicAssetDto {
  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsString()
  name!: string;

  @IsString()
  algorithm!: string;

  @IsString()
  algorithmVersion!: string;

  @IsString()
  purpose!: string;

  @IsString()
  dataOrSystemReference!: string;

  @IsOptional()
  @IsUUID()
  keyReferenceId?: string;

  @IsOptional()
  @IsUUID()
  certificateReferenceId?: string;

  @IsOptional()
  @IsUUID()
  trustAnchorReferenceId?: string;

  @IsUUID()
  ownerIdentityId!: string;

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  rotationScheduleDays?: number;

  @IsOptional()
  @IsInt()
  cryptographicStrengthBits?: number;

  @IsOptional()
  @IsEnum(CryptographicMigrationStatus)
  migrationStatus?: CryptographicMigrationStatus;

  @IsOptional()
  @IsBoolean()
  claimsPostQuantumSecurity?: boolean;

  @IsOptional()
  @IsBoolean()
  historicalVerificationPreserved?: boolean;
}

export class CreateCryptographicPolicyDto {
  @IsOptional()
  @IsString()
  policyCode?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  minimumKeyStrengthBits!: number;

  @IsArray()
  @IsString({ each: true })
  approvedAlgorithms!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deprecatedAlgorithms?: string[];

  @IsUUID()
  ownerIdentityId!: string;

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;
}

export class CreateCryptographicAgilityAssessmentDto {
  @IsOptional()
  @IsString()
  assessmentNumber?: string;

  @IsUUID()
  policyId!: string;

  @IsUUID()
  assessorIdentityId!: string;

  @IsOptional()
  @IsBoolean()
  canVersionAlgorithms?: boolean;

  @IsOptional()
  @IsBoolean()
  canRotateKeys?: boolean;

  @IsOptional()
  @IsBoolean()
  canReplaceCertificates?: boolean;

  @IsOptional()
  @IsBoolean()
  canChangeTrustAnchors?: boolean;

  @IsOptional()
  @IsBoolean()
  canIdentifyAffectedRecords?: boolean;

  @IsOptional()
  @IsBoolean()
  preservesHistoricalVerification?: boolean;

  @IsOptional()
  @IsBoolean()
  canMigrateWithoutDestroyingEvidence?: boolean;
}

export class CreatePostQuantumMigrationItemDto {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  componentReference!: string;

  @IsString()
  currentAlgorithm!: string;

  @IsOptional()
  @IsString()
  targetAlgorithm?: string;

  @IsOptional()
  @IsEnum(PostQuantumMigrationStatus)
  status?: PostQuantumMigrationStatus;

  @IsUUID()
  ownerIdentityId!: string;

  @IsOptional()
  @IsString()
  riskAcceptanceReference?: string;
}

export class RotateCryptographicAssetDto {
  @IsString()
  nextAlgorithm!: string;

  @IsString()
  nextAlgorithmVersion!: string;

  @IsOptional()
  @IsUUID()
  nextKeyReferenceId?: string;

  @IsOptional()
  @IsBoolean()
  historicalVerificationPreserved?: boolean;
}
